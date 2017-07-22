import * as collections from "../core/types.collections";
import * as coreTypes from "../core/types";
import * as net from "../core/net";
import * as logger from "../core/logger";
import * as components from "./components";
import * as commandsDescriptor from "./commands.descriptor";
import * as types from "./types";
import * as constraints from "./constraints";
import * as converters from "./converters";
import * as commands from "./commands";
import * as handler from "./commands.handler";
import * as descriptor from "./modules.descriptor";
import * as appFrames from "../app/frames";
import * as appModules from "../app/modules";
import * as app from "../app/application";

export type LookupType = "module-context";

export type Lookup = {
	type: LookupType;
	name: string;
};

function getLookupType(str: string): LookupType {
	switch (str) {
		case "module":
			return "module-context";
	}

	return null;
}

const LOOKUP_PATTERN = /^(module):([a-zA-Z]+[a-zA-Z0-9._-]*)$/;
export function createLookup(str: string): Lookup {
	if (!LOOKUP_PATTERN.test(str)) {
		throw new coreTypes.Exception(`"${ str } not a valid lookup`);
	}

	const match = str.match(LOOKUP_PATTERN);
	return {
		type: getLookupType(match[1]),
		name: match[2]
	};
}

export class Parameters {
	private lookup: Map<string, Lookup>;
	private defaults: Map<string, string>;

	constructor() {
		this.lookup = new Map();
		this.defaults = new Map();
	}

	has(name: string): boolean {
		return this.lookup.has(name) || this.defaults.has(name);
	}

	get(name: string, context: appModules.ModuleContext): string {
		if (this.lookup.has(name)) {
			const lookup = this.lookup.get(name);

			if (lookup.type === "module-context") {
				return context.data.get(lookup.name);
			}
		}

		if (this.defaults.has(name)) {
			return this.defaults.get(name);
		}

		return null;
	}
}

export class Module extends components.Component {
	private remote: Remote;
	private params: Parameters;
	private modules: collections.Map<Module>;
	private types: collections.Map<types.Type>;
	private commands: collections.Map<commands.Command>;
	private converters: collections.Map<converters.Converter>;
	private constraints: collections.Map<constraints.Constraint>;

	constructor() {
		super(components.ComponentType.Module);

		this.modules = collections.map<Module>();
		this.types = collections.map<types.Type>();
		this.commands = collections.map<commands.Command>();
		this.converters = collections.map<converters.Converter>();
		this.constraints = collections.map<constraints.Constraint>();
	}

	public loaded(): Promise<void> {
		if (isRemoteSource(this.remote)) {
			return this.remote.init();
		} else {
			return Promise.resolve();
		}
	}

	public isRemote(): boolean {
		return this.remote != null || (this.parent && (this.parent as Module).isRemote());
	}

	public getRemote(): Remote {
		return this.remote || (this.parent as Module).getRemote();
	}

	public authenticate() {
	}

	public isNamespaceOnly(): boolean {
		return this.modules.size() > 0
			&& this.types.size() === 0
			&& this.commands.size() === 0
			&& this.constraints.size() === 0;
	}

	public hasParameter(name: string): boolean {
		return this.params.has(name) || (this.parent && (this.parent as Module).hasParameter(name));
	}

	public getParameter(name: string, context: appModules.ModuleContext): string {
		let value = this.params.get(name, context);

		if (!value && this.parent) {
			value = (this.parent as Module).getParameter(name, context);
		}

		return value;
	}

	public addModule(aModule: Module): void {
		aModule.parent = this;
		this.modules.set(aModule.getName(), aModule);
	}

	public hasModule(name: string): boolean {
		return this.modules.has(name);
	}

	public getModule(name: string): Module {
		return this.modules.get(name);
	}

	public getModules(): Module[] {
		return this.modules.values();
	}

	public forEachModule(fn: (aModule: Module) => void): void {
		this.modules.values().forEach(fn);
	}

	public addType(aType: types.Type): void {
		(<any> aType).parent = this;
		this.types.set(aType.getName(), aType);
	}

	public hasType(name: string): boolean {
		return this.types.has(name);
	}

	public getType(name: string): types.Type {
		return this.types.get(name);
	}

	public getTypes(): types.Type[] {
		return this.types.values();
	}

	public forEachType(fn: (type: types.Type) => void): void {
		this.types.values().forEach(fn);
	}

	public addConstraint(aConstraint: constraints.Constraint): void {
		(<any> aConstraint).parent = this;
		this.constraints.set(aConstraint.getName(), aConstraint);
	}

	public hasConstraint(name: string): boolean {
		return this.constraints.has(name);
	}

	public getConstraint(name: string): constraints.Constraint {
		return this.constraints.get(name);
	}

	public getConstraints(): constraints.Constraint[] {
		return this.constraints.values();
	}

	public forEachConstraint(fn: (constraint: constraints.Constraint) => void): void {
		this.constraints.values().forEach(fn);
	}

	public addCommand(aCommand: commands.Command): void {
		(<any> aCommand).parent = this;
		this.commands.set(aCommand.getName(), aCommand);
	}

	public hasCommand(name: string, recursive = false): boolean {
		if (this.commands.has(name)) {
			return true;
		}

		if (!recursive) {
			return false;
		}

		return this.modules.some(((value: Module, key: string) => value.hasCommand(name, true)) as collections.KeyValueBooleanIteratorCallback<Module>);
	}

	public getCommand(name: string, recursive = false): commands.Command {
		if (this.commands.has(name)) {
			return this.commands.get(name);
		}

		if (!recursive) {
			return null;
		}

		let command: commands.Command;
		this.modules.forEach((value) => {
			if (command) {
				return;
			}
			command = value.getCommand(name, true);
		});

		return command;
	}

	public getCommands(): commands.Command[] {
		return this.commands.values();
	}

	public forEachCommand(fn: (command: commands.Command) => void): void {
		this.commands.values().forEach(fn);
	}

	public addConverter(converter: converters.Converter): void {
		(<any> converter).parent = this;
		this.converters.set(converter.getName(), converter);
	}

	public hasConverter(name: string): boolean {
		return this.converters.has(name);
	}

	public getConverter(name: string): converters.Converter {
		return this.converters.get(name);
	}

	public getConverters(): converters.Converter[] {
		return this.converters.values();
	}

	public forEachConverter(fn: (converter: converters.Converter) => void): void {
		this.converters.values().forEach(fn);
	}

	protected defaultManual(): string {
		const markdown = super.defaultManual(),
			builder = components.Component.markdown();

		if (this.modules.size() > 0) {
			builder.h4("Modules:");

			this.modules.forEach((module, name) => {
				builder.li(name);
			});

			builder.newLine();
		}

		if (this.commands.size() > 0) {
			builder.h4("Commands:");

			this.commands.forEach((command, name) => {
				builder.li(name);
			});

			builder.newLine();
		}

		if (this.types.size() > 0) {
			builder.h4("Types:");

			this.types.forEach((type, name) => {
				builder.li(name);
			});

			builder.newLine();
		}

		if (this.constraints.size() > 0) {
			builder.h4("Constraints:");

			this.constraints.forEach((constraint, name) => {
				builder.li(name);
			});

			builder.newLine();
		}

		if (this.converters.size() > 0) {
			builder.h4("Converters:");

			this.converters.forEach((converter, name) => {
				builder.li(name);
			});

			builder.newLine();
		}

		return markdown + "\n" + builder.toString();
	}
}

export abstract class Authenticator {
	protected constructor() {
	}

	public abstract authenticated(): boolean;

	public abstract descriptor(): commandsDescriptor.LocalCommandDescriptor;

	public abstract authenticate(context: app.Context, ...params: any[]): handler.Result;

	public abstract interceptRequest(options: net.RequestProperties, data?: net.RequestData): void;

	public abstract interceptResponse(response: net.HttpResponse): void;
}

class NoAuthentication extends Authenticator {
	constructor() {
		super();
	}

	public descriptor() {
		return null;
	}

	public authenticate(): handler.Result {
		throw new Error("NoAuthentication.authenticate shouldn't be called");
	}

	public authenticated(): boolean {
		return true;
	}

	public interceptRequest(options: net.RequestProperties, data?: net.RequestData): void {
	}

	public interceptResponse(response: net.HttpResponse): void {
	}
}

class BasicAuthentication extends Authenticator {
	private static DESCRIPTOR = {
		name: "login",
		async: false,
		returns: "ui.message",
		parametersForm: "arguments",
		syntax: "login (username string[strings.regex '[a-z]+[a-z0-9]+' i, strings.between 3 15])"
	} as any as commandsDescriptor.LocalCommandDescriptor;

	private username: string;
	private password: string;

	constructor() {
		super();
	}

	public descriptor(): commandsDescriptor.LocalCommandDescriptor {
		return Object.assign({}, BasicAuthentication.DESCRIPTOR, {
			handler: this.authenticate.bind(this)
		}) as commandsDescriptor.LocalCommandDescriptor;
	}

	public authenticate(context: app.Context, username: string): handler.Result {
		if (!username || username.trim().length === 0) {
			return {
				status: handler.ResultStatus.Failure,
				error: "username is empty"
			}; //as commands.handler.FailResult;
		}

		this.username = username.trim();
		return {
			status: handler.ResultStatus.Prompt,
			prompt: {
				type: "password",
				message: "Enter your password:",
				handlePromptValue: this.handlePassword.bind(this)
			}
		} as handler.Result;
	}

	public authenticated(): boolean {
		return this.username != null && this.password != null;
	}

	public interceptRequest(options: net.RequestProperties, data?: net.RequestData): void {
		let value = `${ this.username }:${ this.password }`;
		value = "Basic " + window.btoa(value);

		if (!options.headers) {
			options.headers = {};
		}

		if (coreTypes.is(options.headers, collections.Map)) {
			options.headers.set("Authorization", value);
		} else {
			options.headers["Authorization"] = value;
		}
	}

	public interceptResponse(response: net.HttpResponse): void {
	}

	private handlePassword(password: string): void {
		this.password = password;
	}
}

function authenticatorFactory(method?: descriptor.AuthenticationMethod): Authenticator {
	switch (method) {
		case "basic":
			return new BasicAuthentication();

		default:
			return new NoAuthentication();
	}
}

class RemoteProxyException extends coreTypes.Exception {
	public readonly failed: { name: string; url: net.Url; }[];

	constructor(failed: { name: string; url: net.Url; }[]) {
		super("failed to load proxies");
		this.failed = failed;
	}
}

export interface Remote {
	proxied(): boolean;
	authenticator(): Authenticator;
	base(originName?: string): net.Url | null;
	frame(originName?: string): appFrames.ProxyFrame;
}

export class RemoteSource implements Remote {
	private static DEFAULT_ID = "_DEFAULT";

	private _base: string;
	private _proxy: string;
	private _default: string;
	private _authenticator: Authenticator;
	private _origins: Map<string, net.Url>;
	private _frames: Map<string, appFrames.ProxyFrame>;

	constructor(desc: descriptor.SourceRemoteDescriptor) {
		this._base = desc.base;
		this._proxy = desc.proxy;
		this._frames = new Map();
		this._default = desc.default;
		this._authenticator = authenticatorFactory(desc.auth);

		if (descriptor.isSingleSourceRemoteDescriptor(desc)) {
			this._origins = new Map();
			this._origins.set(RemoteSource.DEFAULT_ID, new net.Url(desc.origin));
		} else if (descriptor.isMultiSourceRemoteDescriptor(desc)) {
			this._origins = Map.from(desc.origins).map<string, net.Url>((origin, name) => [name, new net.Url(origin)]);
		} else {
			this._origins = new Map();

			if (!this._base.startsWith("/")) {
				let path = window.location.pathname;

				if (path.lastIndexOf(".") > path.lastIndexOf("/")) {
					path = path.substring(0, path.lastIndexOf("/") + 1);
				}

				this._base = path + this._base;
			}

			this._origins.set(RemoteSource.DEFAULT_ID, new net.Url(window.location.protocol + "//" + window.location.host));
		}
	}

	init(): Promise<void> {
		if (!this._proxy) {
			return Promise.resolve();
		}

		const future = new coreTypes.Future<void>();

		let processed = 0;
		const failed = [] as { name: string; url: net.Url; }[];
		const check = () => {
			if (this._origins.size === failed.length + processed) {
				if (failed.empty()) {
					future.resolve();
				} else {
					future.reject(new RemoteProxyException(failed));
				}
			}
		};
		const resolved = () => {
			processed++;
			check();
		};
		const rejected = (name: string, url: net.Url) => {
			logger.error("failed to load frame");
			failed.push({name, url});
			check();
		};

		this._origins.forEach((origin, name) => {
			const url = new net.Url(this._proxy, origin);

			appFrames.create(url).then((frame: appFrames.ProxyFrame) => {
				this._frames.set(name, frame);
				resolved();
			}).catch(rejected.bind(null, name, url));
		});

		check();

		return future.asPromise();
	}

	public proxied() {
		return this._proxy != null;
	}

	public frame(originName?: string) {
		originName = this.getOriginName(originName);
		return this._frames.get(originName);
	}

	public authenticator(): Authenticator {
		return this._authenticator;
	}

	public base(originName?: string): net.Url | null {
		originName = this.getOriginName(originName);
		const origin: net.Url = this._origins.has(originName) ? this._origins.get(originName) : null;

		return origin != null ? new net.Url(this._base, origin) : null;
	}

	public loginCommandDescriptor(): commandsDescriptor.LocalCommandDescriptor {
		return this._authenticator.descriptor();
	}

	private getOriginName(originName?: string): string {
		return originName || this._default || RemoteSource.DEFAULT_ID;
	}
}

function isRemoteSource(remote: Remote): remote is RemoteSource {
	return remote instanceof RemoteSource;
}

export class RemotePath implements Remote {
	private _path: string;
	private _parent: Remote; // assigned via the builder

	constructor(path: string) {
		this._path = path;
	}

	public proxied() {
		return this._parent.proxied();
	}

	public frame(originName?: string) {
		return this._parent.frame(originName);
	}

	public authenticator(): Authenticator {
		return this._parent.authenticator();
	}

	public base(originName?: string): net.Url | null {
		const parent = this._parent.base(originName);
		return parent ? new net.Url(this._path, parent) : null;
	}
}

export function isRemotePath(remote: Remote): remote is RemotePath {
	return remote instanceof RemotePath;
}