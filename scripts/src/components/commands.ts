import * as handler from "./commands.handler";
import * as collections from "../core/types.collections";
import * as coreTypes from "../core/types";
import * as net from "../core/net";
import * as appModules from "../app/modules";
import * as modules from "./modules";
import * as components from "./components";
import * as converters from "./converters";
import * as registry from "./registry";
import * as types from "./types";
import * as syntax from "./syntax";

export class ExecutionResult {
	private asynced: boolean;

	protected type: types.Type;
	protected future: coreTypes.Future<any>;

	constructor(type: types.Type, asynced: boolean) {
		this.type = type;
		this.asynced = asynced;
		this.future = new coreTypes.Future<any>();
	}

	public isAsync(): boolean {
		return this.asynced;
	}

	public getType(): types.Type {
		return this.type;
	}

	public then(successHandler: (value: any) => void): ExecutionResult {
		this.future.then(successHandler);
		return this;
	}

	/**
	 * @override
	 */
	public catch(errorHandler: (error: coreTypes.Exception) => void): ExecutionResult {
		this.future.catch(errorHandler);
		return this;
	}

	public resolve(value: any): void {
		let str: string;
		try {
			str = JSON.stringify(value) || "undefined";
		} catch (e) {
			str = value.toString();
		}
		ga("send", "event", "Commands", "execution.result - resolved", str);
		this.future.resolve(value);
	}

	public reject(error: coreTypes.Exception): void {
		ga("send", "event", "Commands", "execution.result - rejected", error.message);
		this.future.reject(error);
	}
}

class ExecutionResultAny extends ExecutionResult {
	public resolve(value: any): void {
		this.setInferredType(value);
		this.future.resolve(value);
	}

	private setInferredType(value: any): void {
		this.type = registry.guessType(value);
	}
}

export class ExecutionParameters {
	private names: string[];
	private values: collections.FugaziMap<any>;

	public constructor() {
		this.names = [];
		this.values = collections.map<any>();
	}

	public add(name: string, value: any): void {
		this.names.push(name);
		this.values.set(name, value);
	}

	public has(name: string): boolean {
		return this.values.has(name);
	}

	public get(name: string): any {
		return this.values.get(name);
	}

	public asList(): any[] {
		return this.names.map<any>(name => this.values.get(name));
	}

	public asStruct(): coreTypes.PlainObject<any> {
		return this.values.asObject();
	}

	public asMap(): collections.FugaziMap<any> {
		return this.values.clone();
	}
}

export class Executer {
	private fn: (params: ExecutionParameters) => void;
	private executionResult: ExecutionResult;

	public constructor(result: ExecutionResult, fn: (params: ExecutionParameters) => void) {
		this.executionResult = result;
		this.fn = fn;
	}

	get result(): ExecutionResult {
		return this.executionResult;
	}

	public execute(params: ExecutionParameters): ExecutionResult {
		this.fn(params);
		return this.executionResult;
	}
}

function getHandlerErrorMessage(error: any): string {
	if (typeof error === "string") {
		return error;
	}

	// TODO: should be 'error instanceof Error' but it fails in runtime, for some reason Error is undefined
	if (error instanceof window["Error"]) {
		return error.message;
	}

	return error.toString();
}

export abstract class Command extends components.Component {
	protected asynced: boolean;
	protected returnType: types.Type;
	protected convert: {
		from: types.Type;
		converter: converters.Converter;
	};
	protected syntax: syntax.SyntaxRule[];

	constructor() {
		super(components.ComponentType.Command);
		this.syntax = [];
	}

	public isAsync(): boolean {
		return this.asynced;
	}

	public getReturnType(): types.Type {
		return this.returnType;
	}

	public getSyntax(): syntax.SyntaxRule[] {
		return this.syntax.clone();
	}

	public isRestricted(): boolean {
		return true;
	}

	public executeLater(context: appModules.ModuleContext): Executer {
		let executionResult = this.returnType.is("any") ? new ExecutionResultAny(this.returnType, this.asynced) : new ExecutionResult(this.returnType, this.asynced),
			executer = new Executer(executionResult, params => {
				this.invokeHandler(context, params).then(this.handleHandlerResult.bind(this, "then", executionResult), this.handleHandlerResult.bind(this, "catch", executionResult));
			});

		return executer;
	}

	public executeNow(context: appModules.ModuleContext, params: ExecutionParameters): ExecutionResult {
		let executer = this.executeLater(context);
		executer.execute(params);
		return executer.result;
	}

	protected abstract invokeHandler(context: appModules.ModuleContext, params: ExecutionParameters): Promise<handler.Result>;

	protected handleHandlerResult(cbType: "then" | "catch", executionResult: ExecutionResult, result: handler.Result): void {
		if (!handler.isHandlerResult(result)) {
			result = cbType === "then" ? {
				status: handler.ResultStatus.Success,
				value: result
			} : {
				status: handler.ResultStatus.Failure,
				error: getHandlerErrorMessage(result)
			};
		}

		if (result.status === handler.ResultStatus.Prompt) {
			executionResult.resolve((result as handler.PromptResult).prompt);
		} else if (result.status === handler.ResultStatus.Success) {
			if (this.convert) {
				try {
					result.value = this.knownConvertResult(result.value);
				} catch (e) {
					executionResult.reject(e);
					return;
				}
			}
			try {
				if (this.validateResultValue(result.value) || this.validateResultValue(this.unknownConvertResult(result.value))) {
					executionResult.resolve(result.value);
				} else {
					executionResult.reject(new coreTypes.Exception("execution result doesn't match the declared type"));
				}
			} catch (e) {
				executionResult.reject(e);
			}
		} else {
			executionResult.reject(new coreTypes.Exception(result.error));
		}
	}

	protected validateResultValue(result: any): boolean {
		return result === null || this.returnType.validate(handler.isHandlerResult(result) ? result.value : result);
	}

	private knownConvertResult(value: any): any {
		if (this.convert.converter) {
			return this.convert.converter.convert(value);
		}

		if (registry.hasConverter(this.convert.from, this.returnType)) {
			return registry.getConverter(this.convert.from, this.returnType).convert(value);
		}

		return value;
	}

	private unknownConvertResult(value: any): any {
		if (typeof value === "string") {
			const stringType = registry.getType("string");

			if (this.returnType.is(stringType)) {
				return registry.getConverter(stringType, this.returnType).convert(value);
			}
		}

		return value;
	}

	protected defaultManual(): string {
		const markdown = super.defaultManual(),
			builder = components.Component.markdown().h4("Syntax:").newLine();

		this.syntax.forEach(rule => {
			builder.li(rule.raw);
		});

		return markdown + "\n" + builder.newLine().toString();
	}
}

export class LocalCommand extends Command {
	protected parametersForm: handler.PassedParametersForm;
	protected handler: handler.AsyncedHandler;

	constructor() {
		super();
	}

	protected invokeHandler(context: appModules.ModuleContext, params: ExecutionParameters): Promise<handler.Result | any> {
		switch (this.parametersForm) {
			case handler.PassedParametersForm.Arguments:
				return this.handler.apply(null, [context].concat(params.asList()));

			case handler.PassedParametersForm.List:
				return this.handler(context, params.asList());

			case handler.PassedParametersForm.Map:
				return this.handler(context, params.asMap());

			case handler.PassedParametersForm.Struct:
				return this.handler(context, params.asStruct());
		}
	}
}

interface PreparedEndpointParams {
	endpoint: string,
	params: collections.FugaziMap<any>
}

export const ENDPOINT_ARGUMENTS_REGEX = /(\{\s*([a-z0-9]+)\s*\})/gi;
export enum EndpointParamReplacementPart {
	ToReplace = 1,
	ParamName = 2
}

export class RemoteCommand extends Command {
	protected endpoint: { raw: string, params: string[] };
	protected method: net.HttpMethod;

	constructor() {
		super();

		this.asynced = true;
	}

	protected invokeHandler(context: appModules.ModuleContext, params: ExecutionParameters): Promise<handler.Result> {
		const future = new coreTypes.Future<handler.Result>();

		if (!this.authenticator.authenticated()) {
			future.reject(new coreTypes.Exception("not authenticated"));
		}
		else {
			if ((this.parent as modules.Module).isRemote()) {
				const remoteSourceId = context.getParent().getRemoteSource(this.parent.getPath());
				const remote: modules.Remote = (this.parent as modules.Module).getRemote();

				try {
					const preparedEndpointParams = this.expandEndpointArguments(context, params);
					this.executeVia(future, remote, remoteSourceId, preparedEndpointParams);
				} catch (e) {
					future.reject(e);
				}
			} else {
				future.reject(new coreTypes.Exception(
					`cannot execute remote command '${this.getName()}' without 
					remote definition on its enclosing modules`));
			}
		}

		return future.asPromise();
	}

	protected get authenticator(): modules.Authenticator {
		return (this.getParent() as modules.Module).getRemote().authenticator();
	}

	private executeVia(future: coreTypes.Future<handler.Result>, remote: modules.Remote, remoteSourceId: string, endpointParams: PreparedEndpointParams): void {
		const data = endpointParams.params;
		const props = {
			cors: true,
			method: this.method,
			url: new net.Url(endpointParams.endpoint, remote.base(remoteSourceId))
		} as net.RequestProperties;

		if (coreTypes.isPlainObject(data) || coreTypes.is(data, collections.FugaziMap)) {
			props.contentType = net.ContentTypes.Json;
		}

		this.authenticator.interceptRequest(props, data);

		if (remote.proxied()) {
			remote.frame(remoteSourceId).execute(props, data)
				.then(this.success.bind(this))
				.catch(this.failure.bind(this));
		} else {
			net.http(props)
				.success(this.success.bind(this, future))
				.fail(this.failure.bind(this, future))
				.send(data);
		}
	}

	private expandEndpointArguments(context: appModules.ModuleContext, params: ExecutionParameters): PreparedEndpointParams {
		const prepared: PreparedEndpointParams = {endpoint: this.endpoint.raw, params: params.asMap()};
		const searchOn = prepared.endpoint;

		let match = ENDPOINT_ARGUMENTS_REGEX.exec(searchOn);
		while (match != null) {
			const toReplace: string = match[EndpointParamReplacementPart.ToReplace];
			const replacementKey: string = match[EndpointParamReplacementPart.ParamName];

			//let value = params.has(replacementKey) ? params.get(replacementKey).toString() : context.data.get(replacementKey);
			let value: string;
			if (params.has(replacementKey)) {
				value = params.get(replacementKey).toString();
			} else {
				value = (this.getParent() as modules.Module).getParameter(replacementKey, context);
			}

			if (!value) {
				throw new coreTypes.Exception(`can't not execute command, argument "${ replacementKey }" has no value`);
			}

			prepared.endpoint = prepared.endpoint.replace(toReplace, value);
			prepared.params.remove(replacementKey);

			match = ENDPOINT_ARGUMENTS_REGEX.exec(searchOn);
		}

		return prepared;
	}

	private success(future: coreTypes.Future<handler.Result>, response: net.HttpResponse): void {
		this.authenticator.interceptResponse(response);
		future.resolve(response.guessData());
	}

	private failure(future: coreTypes.Future<handler.Result>, response: net.HttpResponse): void {
		this.authenticator.interceptResponse(response);
		future.reject(response.guessData());
	}
}

export function wrapSyncedHandler(syncedHandler: handler.SyncedHandler, ...args: any[]): Promise<handler.Result> {
	var future = new coreTypes.Future<handler.Result>();

	try {
		future.resolve(syncedHandler.apply(null, args));
	} catch (e) {
		future.reject(e);
	}

	return future.asPromise();
}
