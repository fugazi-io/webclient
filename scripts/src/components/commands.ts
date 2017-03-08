/// <reference path="../app/application.ts" />
/// <reference path="components.ts" />
/// <reference path="registry.ts" />
/// <reference path="syntax.ts" />
/// <reference path="types.ts" />

/**
 * Created by nitzan on 29/03/2016.
 */

namespace fugazi.components.commands {
	export class ExecutionResult {
		private asynced: boolean;

		protected type: types.Type;
		protected future: fugazi.Future<any>;

		constructor(type: types.Type, asynced: boolean) {
			this.type = type;
			this.asynced = asynced;
			this.future = new fugazi.Future<any>();
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
		public catch(errorHandler: (error: fugazi.Exception) => void): ExecutionResult {
			this.future.catch(errorHandler);
			return this;
		}

		public resolve(value: any): void {
			this.future.resolve(value);
		}

		public reject(error: fugazi.Exception): void {
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
		private values: collections.Map<any>;

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

		public asStruct(): fugazi.PlainObject<any> {
			return this.values.asObject();
		}

		public asMap(): collections.Map<any> {
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

	export abstract class Command extends Component {
		protected asynced: boolean;
		protected returnType: types.Type;
		protected convert: {
			from: types.Type;
			converter: converters.Converter;
		};
		protected syntax: syntax.SyntaxRule[];

		constructor() {
			super(ComponentType.Command);
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

		public executeLater(context: app.modules.ModuleContext): Executer {
			let executionResult: ExecutionResult = this.returnType.is("any") ? new ExecutionResultAny(this.returnType, this.asynced) : new ExecutionResult(this.returnType, this.asynced),
				executer = new Executer(executionResult, params => {
					this.invokeHandler(context, params).then(this.handleHandlerResult.bind(this, executionResult), executionResult.reject.bind(executionResult));
				});

			return executer;
		}

		public executeNow(context: app.modules.ModuleContext, params: ExecutionParameters): ExecutionResult {
			let executer: Executer = this.executeLater(context);
			executer.execute(params);
			return executer.result;
		}

		protected abstract invokeHandler(context: app.modules.ModuleContext, params: ExecutionParameters): Promise<handler.Result>;

		protected handleHandlerResult(executionResult: ExecutionResult, result: handler.Result): void {
			if (!handler.isHandlerResult(result)) {
				result = {
					status: handler.ResultStatus.Success,
					value: result
				};
			}

			if (result.status === handler.ResultStatus.Prompt) {
				executionResult.resolve((result as handler.PromptResult).prompt);
			} else if (result.status === handler.ResultStatus.Success) {
				if (this.convert) {
					try {
						result.value = this.knownConvertResult(result.value);
					} catch(e) {
						executionResult.reject(e);
						return;
					}
				}
				try {
					if (this.validateResultValue(result.value) || this.validateResultValue(this.unknownConvertResult(result.value))) {
						executionResult.resolve(result.value);
					} else {
						executionResult.reject(new fugazi.Exception("execution result doesn't match the declared type"));
					}
				} catch(e) {
					executionResult.reject(e);
				}
			} else {
				executionResult.reject(new fugazi.Exception(result.error));
			}

			/*if (!handler.isHandlerResult(result)) {
				executionResult.reject(new fugazi.Exception("invalid result"));
			} else if (result.status === handler.ResultStatus.Prompt) {
				executionResult.resolve((result as handler.PromptResult).prompt);
			} else if (result.status === handler.ResultStatus.Success) {
				if (!this.validateResultValue(result.value)) {
					executionResult.reject(new fugazi.Exception("execution result doesn't match the declared type"));
				} else {
					executionResult.resolve(result.value);
				}
			} else {
				executionResult.reject(new fugazi.Exception(result.error));
			}*/
		}

		protected validateResultValue(result: any): boolean {
			return this.returnType.validate(handler.isHandlerResult(result) ? result.value : result);
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
	}

	export class LocalCommand extends Command {
		protected parametersForm: handler.PassedParametersForm;
		protected handler: handler.AsyncedHandler;

		constructor() {
			super();
		}

		protected invokeHandler(context: app.modules.ModuleContext, params: ExecutionParameters): Promise<handler.Result | any> {
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
		params: collections.Map<any>
	}

	const ENDPOINT_ARGUMENTS_REGEX = /(\{\s*([a-z0-9]+)\s*\})/gi;
	enum EndpointParamReplacementPart {
		ToReplace = 1,
		ParamName = 2
	}

	class RemoteCommand extends Command {
		protected endpoint: { raw: string, params: string[] };
		protected method: net.HttpMethod;
		protected future: fugazi.Future<handler.Result>;

		constructor() {
			super();

			this.asynced = true;
			this.future = new fugazi.Future<handler.Result>();
		}

		protected invokeHandler(context: app.modules.ModuleContext, params: ExecutionParameters): Promise<handler.Result> {
			if (!this.authenticator.authenticated()) {
				this.future.reject(new Exception("not authenticated"));
			}
			else {
				if ((this.parent as modules.Module).isRemote()) {
					const remoteSourceId = context.getParent().getRemoteSource(this.parent.getPath());
					const remote: modules.Remote = (this.parent as modules.Module).getRemote();

					try {
						const preparedEndpointParams = this.expandEndpointArguments(context, params);
						this.executeVia(remote, remoteSourceId, preparedEndpointParams);

					} catch (e) {
						this.future.reject(e);
					}
				} else {
					this.future.reject(new fugazi.Exception(
						`cannot execute remote command '${this.getName()}' without 
					remote definition on its enclosing modules`));
				}
			}

			return this.future.asPromise();
		}

		protected get authenticator(): fugazi.components.modules.Authenticator {
			return (this.getParent() as modules.Module).getRemote().authenticator();
		}

		private executeVia(remote: modules.Remote, remoteSourceId: string, endpointParams: PreparedEndpointParams): void {
			const data = endpointParams.params;
			const props = {
				cors: true,
				method: this.method,
				url: new net.Url(endpointParams.endpoint, remote.base(remoteSourceId))
			} as net.RequestProperties;
			this.authenticator.interceptRequest(props, data);

			if (remote.proxied()) {
				remote.frame(remoteSourceId).execute(props, data)
					.then(this.success.bind(this))
					.catch(this.failure.bind(this));
			} else {
				net.http(props)
					.success(this.success.bind(this))
					.fail(this.failure.bind(this))
					.send(data);
			}
		}

		private expandEndpointArguments(context: app.modules.ModuleContext, params: ExecutionParameters): PreparedEndpointParams {
			const prepared: PreparedEndpointParams = { endpoint: this.endpoint.raw, params: params.asMap() };
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
					throw new Exception(`can't not execute command, argument "${ replacementKey }" has no value`);
				}

				prepared.endpoint = prepared.endpoint.replace(toReplace, value);
				prepared.params.remove(replacementKey);

				match = ENDPOINT_ARGUMENTS_REGEX.exec(searchOn);
			}

			return prepared;
		}

		private success(response: net.HttpResponse): void {
			this.authenticator.interceptResponse(response);
			let data;
			try {
				data = JSON.parse(response.getData());
			} catch (e) {
				data = response.getData();
			}

			this.future.resolve(data);
		}

		private failure(response: net.HttpResponse): void {
			this.authenticator.interceptResponse(response);
			this.future.reject(new fugazi.Exception(response.getData()));
		}
	}

	export namespace handler {
		export function isHandlerResult(value: any): value is Result {
			return fugazi.isPlainObject(value) && typeof ResultStatus[value.status] === "string";
		}

		export enum ResultStatus {
			Success,
			Failure,
			Prompt
		}

		export interface Result {
			status: ResultStatus;
			value?: any;
			error?: string;
		}

		export interface PromptData {
			type: "password";
			message: string;
			handlePromptValue: (value: string) => void;
		}

		export interface PromptResult extends Result {
			prompt: PromptData;
		}

		export function isPromptData(result: any): result is PromptData {
			return result && (result as PromptData).type === "password" && typeof (result as PromptData).message === "string";
		}

		export enum PassedParametersForm {
			List,
			Arguments,
			Struct,
			Map
		}

		export interface Handler extends Function {}

		export interface SyncedHandler extends Handler {
			(context: app.modules.ModuleContext, ...params: any[]): Result | any;
		}

		export interface AsyncedHandler extends Handler {
			(context: app.modules.ModuleContext, ...params: any[]): Promise<Result>;
		}
	}

	function wrapSyncedHandler(syncedHandler: handler.SyncedHandler, ...args: any[]): Promise<handler.Result> {
		var future = new Future<handler.Result>();

		try {
			future.resolve(syncedHandler.apply(null, args));
		} catch (e) {
			future.reject(e);
		}

		return future.asPromise();
	}

	export namespace descriptor {
		export interface Descriptor extends components.descriptor.Descriptor {
			returns: types.Definition;
			convert?: {
				from: string;
				converter?: string;
			}
			syntax: string | string[];
			async?: boolean;
		}

		export interface LocalCommandDescriptor extends Descriptor {
			handler: handler.Handler;
			parametersForm?: "list" | "arguments" | "map" | "struct";
		}

		export interface RemoteHandlerDescriptor {
			endpoint: string;
			method?: string;
		}

		export interface RemoteCommandDescriptor extends Descriptor {
			handler: RemoteHandlerDescriptor;
		}
	}

	export namespace builder {
		export function create(commandDescriptor: descriptor.Descriptor, parent: components.builder.Builder<components.Component>): components.builder.Builder<Command>;
		export function create<T extends LocalCommand>(commandDescriptor: descriptor.Descriptor, parent: components.builder.Builder<components.Component>, ctor: { new (): T }): components.builder.Builder<Command>;
		export function create(commandDescriptor: descriptor.Descriptor, parent: components.builder.Builder<components.Component>, ctor?: any): components.builder.Builder<Command> {
			let loader = new components.descriptor.ExistingLoader(<descriptor.LocalCommandDescriptor> commandDescriptor);

			if (fugazi.is((<descriptor.LocalCommandDescriptor> commandDescriptor).handler, Function)) {
				return new LocalCommandBuilder(loader, parent);
			}

			if (fugazi.isPlainObject((<descriptor.RemoteCommandDescriptor> commandDescriptor).handler)) {
				return new RemoteCommandBuilder(loader, parent);
			}

			throw new components.builder.Exception("invalid command descriptor");
		}

		class Builder<T extends Command> extends components.builder.BaseBuilder<T, descriptor.Descriptor> {
			private returnType: types.TextualDefinition | components.builder.Builder<types.Type>;
			private syntaxBuilders: components.builder.Builder<syntax.SyntaxRule>[];

			protected onDescriptorReady(): void {
				this.syntaxBuilders = [];

				if (this.componentDescriptor.returns != null
					&& (typeof this.componentDescriptor.returns === "string" && types.descriptor.isAnonymousDefinition(this.componentDescriptor.returns))
						|| isPlainObject(this.componentDescriptor.returns)) {
					this.returnType = types.builder.create(<string> this.componentDescriptor.returns, this);
					this.innerBuilderCreated();
				} else {
					this.returnType = this.componentDescriptor.returns as string || "void";
				}

				if (typeof this.componentDescriptor.syntax === "string") {
					this.componentDescriptor.syntax = [this.componentDescriptor.syntax];
				}

				this.componentDescriptor.syntax.forEach(syntaxString => {
					this.innerBuilderCreated();
					return this.syntaxBuilders.push(syntax.builder.create(syntaxString, this))
				});
			}

			protected concreteBuild(): void {
				let component: any = (<any> this.component);

				component.asynced = this.componentDescriptor.async || false;
				this.syntaxBuilders.forEach(syntaxBuilder => syntaxBuilder.build().then(this.innerBuilderCompleted.bind(this), this.future.reject));

				if (fugazi.is(this.returnType, components.builder.BaseBuilder)) {
					(<components.builder.Builder<types.Type>> this.returnType).build().then(this.innerBuilderCompleted.bind(this), this.future.reject);
				}
			}

			protected concreteAssociate(): void {
				var component: any = (<any> this.component);

				if (fugazi.is(this.returnType, components.builder.BaseBuilder)) {
					(<components.builder.Builder<types.Type>> this.returnType).associate();
					component.returnType = (<components.builder.Builder<types.Type>> this.returnType).getComponent();
				} else { // types.TextualDefinition AKA string
					component.returnType = this.resolve<types.Type>(ComponentType.Type, <string> this.returnType);
				}

				if (this.componentDescriptor.convert) {
					component.convert = {
						from: this.resolve<types.Type>(ComponentType.Type, this.componentDescriptor.convert.from)
					}

					if (this.componentDescriptor.convert.converter) {
						component.convert.converter = this.resolve<converters.Converter>(ComponentType.Converter, this.componentDescriptor.convert.converter);
					}
				}

				this.syntaxBuilders.forEach(syntaxBuilder => {
					syntaxBuilder.associate();
					component.syntax.push(syntaxBuilder.getComponent());
				});
			}
		}

		function getPassedParametersForm(str: string): handler.PassedParametersForm {
			if (str === "list") {
				return handler.PassedParametersForm.List;
			}

			if (str === "struct") {
				return handler.PassedParametersForm.Struct;
			}

			if (str === "map") {
				return handler.PassedParametersForm.Map;
			}

			return handler.PassedParametersForm.Arguments;
		}

		class LocalCommandBuilder extends Builder<LocalCommand> {
			constructor(loader: components.descriptor.Loader<descriptor.Descriptor>, parent?: components.builder.Builder<Component>, ctor?: { new (): LocalCommand }) {
				super(ctor || LocalCommand, loader, parent);
			}

			protected concreteBuild(): void {
				var component: any;

				super.concreteBuild();

				component = (<any> this.component);

				if (component.async) {
					component.handler = (<descriptor.LocalCommandDescriptor> this.componentDescriptor).handler;
				} else {
					component.handler = wrapSyncedHandler.bind(null, (<descriptor.LocalCommandDescriptor> this.componentDescriptor).handler);
				}

				component.parametersForm = getPassedParametersForm((<descriptor.LocalCommandDescriptor> this.componentDescriptor).parametersForm);
			}
		}

		class RemoteCommandBuilder extends Builder<RemoteCommand> {
			constructor(loader: components.descriptor.Loader<descriptor.Descriptor>, parent?: components.builder.Builder<Component>) {
				super(RemoteCommand, loader, parent);
			}

			protected concreteAssociate(): void {
				super.concreteAssociate();

				const endpointParams = this.getRequiredEndpointParameters(EndpointParamReplacementPart.ParamName);

				(this.component as any).method = net.stringToHttpMethod((<descriptor.RemoteCommandDescriptor> this.componentDescriptor).handler.method || "GET");
				(this.component as any).endpoint = {
					raw: (<descriptor.RemoteCommandDescriptor> this.componentDescriptor).handler.endpoint,
					params: endpointParams
				};

				(this.component as any).syntax.forEach((rule: syntax.SyntaxRule) => {
					const syntaxParams = rule.getTokens().filter(t => t.getTokenType() == syntax.TokenType.Parameter) as syntax.Parameter[];
					const syntaxParamsNames = syntaxParams.map<string>(param => param.getName());
					const existing = endpointParams.filter(name => !syntaxParamsNames.includes(name));

					if (!existing.empty() && !existing.every(name => (this.component.getParent() as modules.Module).hasParameter(name))) {
						throw new fugazi.Exception(
							`Cannot build remote command ${ this.component.getPath().toString() }, ` +
							`since syntax rule ${ rule.getName() } does not provide all the parameters ` +
							`required by endpoint "${ (this.component as any).endpoint }"`
						);
					}
				});
			}

			private getRequiredEndpointParameters(part?: EndpointParamReplacementPart) {
				let matches = [] as string[];
				const endpoint = (this.componentDescriptor as descriptor.RemoteCommandDescriptor).handler.endpoint;
				let match = ENDPOINT_ARGUMENTS_REGEX.exec(endpoint);

				while (match != null) {
					if (part) {
						matches.push(match[part]);
					} else {
						matches = matches.concat(match);
					}
					match = ENDPOINT_ARGUMENTS_REGEX.exec(endpoint);
				}

				return matches;
			}
		}
	}
}
