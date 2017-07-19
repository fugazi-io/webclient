/// <reference path="../core/polyfill.ts" />
/// <reference path="../core/types.ts" />
/// <reference path="../core/net.ts" />
/// <reference path="../app/frames.ts" />
/// <reference path="../app/modules.ts" />
/// <reference path="constraints.ts" />
/// <reference path="converters.ts" />
/// <reference path="components.ts" />
/// <reference path="commands.ts" />
/// <reference path="types.ts" />

/**
 * Created by nitzan on 12/03/2016.
 */

namespace fugazi.components.modules {
	type LookupType = "module-context";

	type Lookup = {
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
	function createLookup(str: string): Lookup {
		if (!LOOKUP_PATTERN.test(str)) {
			throw new Exception(`"${ str } not a valid lookup`);
		}

		const match = str.match(LOOKUP_PATTERN);
		return {
			type: getLookupType(match[1]),
			name: match[2]
		};
	}

	class Parameters {
		private lookup: Map<string, Lookup>;
		private defaults: Map<string, string>;

		constructor() {
			this.lookup = new Map();
			this.defaults = new Map();
		}

		has(name: string): boolean {
			return this.lookup.has(name) || this.defaults.has(name);
		}

		get(name: string, context: app.modules.ModuleContext): string {
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

	export class Module extends Component {
		private remote: Remote;
		private params: Parameters;
		private modules: collections.Map<Module>;
		private types: collections.Map<types.Type>;
		private commands: collections.Map<commands.Command>;
		private converters: collections.Map<converters.Converter>;
		private constraints: collections.Map<types.constraints.Constraint>;

		constructor() {
			super(components.ComponentType.Module);

			this.modules = collections.map<Module>();
			this.types = collections.map<types.Type>();
			this.commands = collections.map<commands.Command>();
			this.converters = collections.map<converters.Converter>();
			this.constraints = collections.map<types.constraints.Constraint>();
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

		public authenticate() {}

		public isNamespaceOnly(): boolean {
			return this.modules.size() > 0
				&& this.types.size() === 0
				&& this.commands.size() === 0
				&& this.constraints.size() === 0;
		}

		public hasParameter(name: string): boolean {
			return this.params.has(name) || (this.parent && (this.parent as Module).hasParameter(name));
		}

		public getParameter(name: string, context: app.modules.ModuleContext): string {
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

		public addConstraint(aConstraint: types.constraints.Constraint): void {
			(<any> aConstraint).parent = this;
			this.constraints.set(aConstraint.getName(), aConstraint);
		}

		public hasConstraint(name: string): boolean {
			return this.constraints.has(name);
		}

		public getConstraint(name: string): types.constraints.Constraint {
			return this.constraints.get(name);
		}

		public getConstraints(): types.constraints.Constraint[] {
			return this.constraints.values();
		}

		public forEachConstraint(fn: (constraint: types.constraints.Constraint) => void): void {
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
				builder = Component.markdown();

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
		protected constructor() {}

		public abstract authenticated(): boolean;
		public abstract descriptor(): commands.descriptor.LocalCommandDescriptor;
		public abstract authenticate(context: app.Context, ...params: any[]): commands.handler.Result;
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

		public authenticate(): commands.handler.Result {
			throw new Error("NoAuthentication.authenticate shouldn't be called");
		}

		public authenticated(): boolean {
				return true;
		}

		public interceptRequest(options: net.RequestProperties, data?: net.RequestData): void {}

		public interceptResponse(response: net.HttpResponse): void {}
	}

	class BasicAuthentication extends Authenticator {
		private static DESCRIPTOR = {
			name: "login",
			async: false,
			returns: "ui.message",
			parametersForm: "arguments",
			syntax: "login (username string[strings.regex '[a-z]+[a-z0-9]+' i, strings.between 3 15])"
		} as any as commands.descriptor.LocalCommandDescriptor;

		private username: string;
		private password: string;

		constructor() {
			super();
		}

		public descriptor(): commands.descriptor.LocalCommandDescriptor {
			return Object.assign({}, BasicAuthentication.DESCRIPTOR, {
				handler: this.authenticate.bind(this)
			}) as commands.descriptor.LocalCommandDescriptor;
		}

		public authenticate(context: app.Context, username: string): commands.handler.Result {
			if (!username || username.trim().length === 0) {
				return {
					status: commands.handler.ResultStatus.Failure,
					error: "username is empty"
				} as commands.handler.FailResult;
			}

			this.username = username.trim();
			return {
				status: commands.handler.ResultStatus.Prompt,
				prompt: {
					type: "password",
					message: "Enter your password:",
					handlePromptValue: this.handlePassword.bind(this)
				}
			} as commands.handler.Result;
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

			if (is(options.headers, collections.Map)) {
				options.headers.set("Authorization", value);
			} else {
				options.headers["Authorization"] = value;
			}
		}

		public interceptResponse(response: net.HttpResponse): void {}

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

	class RemoteProxyException extends Exception {
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
		frame(originName?: string): app.frames.ProxyFrame;
	}

	export class RemoteSource implements Remote {
		private static DEFAULT_ID = "_DEFAULT";

		private _base: string;
		private _proxy: string;
		private _default: string;
		private _authenticator: Authenticator;
		private _origins: Map<string, net.Url>;
		private _frames: Map<string, app.frames.ProxyFrame>;

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

			const future = new Future<void>();

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
				failed.push({ name, url });
				check();
			};

			this._origins.forEach((origin, name) => {
				const url = new net.Url(this._proxy, origin);

				app.frames.create(url).then((frame: app.frames.ProxyFrame) => {
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

		public loginCommandDescriptor(): commands.descriptor.LocalCommandDescriptor {
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

	function isRemotePath(remote: Remote): remote is RemotePath {
		return remote instanceof RemotePath;
	}

	export namespace descriptor {
		var loadingScriptModules: collections.Map<ScriptLoader> = collections.map<ScriptLoader>();

		/**
		 * Called by a loaded (script) component
		 * @param descriptor
		 */
		export function loaded(moduleDescriptor: Descriptor): void {
			let currentScript = document.currentScript as HTMLScriptElement,
				name: string = currentScript.id;

			if (!loadingScriptModules.has(name)) {
				logger.error("unexpected module loaded");
				dom.remove(currentScript);
				return;
			}

			loadingScriptModules.remove(name).loadedCalled(moduleDescriptor);
		}

		export interface InnerComponentsCollection<T extends components.descriptor.Descriptor> {}

		export interface InnerComponentsArrayCollection<T extends components.descriptor.Descriptor> extends InnerComponentsCollection<T>, Array<string | T> {}

		export interface InnerComponentsObjectCollection<T extends components.descriptor.Descriptor> extends InnerComponentsCollection<T>, fugazi.PlainObject<string | T> {}

		export interface InnerModulesCollection {}

		export interface InnerModulesArrayCollection extends InnerModulesCollection, Array<Descriptor | string> {}

		export interface InnerModulesObjectCollection extends InnerModulesCollection, fugazi.PlainObject<Descriptor | string> {}

		export interface Descriptor extends components.descriptor.Descriptor {
			basePath?: string; // set when building
			remote?: RemoteDescriptor;
			lookup?: { [name: string]: string };
			modules?: InnerModulesCollection;
			types?: string | InnerComponentsCollection<types.descriptor.Descriptor>;
			commands?: string | InnerComponentsCollection<commands.descriptor.Descriptor>;
			converters?: string | InnerComponentsCollection<converters.descriptor.Descriptor>;
			constraints?: string | InnerComponentsCollection<types.constraints.descriptor.Descriptor>;
		}

		export type AuthenticationMethod = "none" | "basic" | "custom";

		export interface BaseSourceRemoteDescriptor {
			base?: string;
			proxy?: string;
			default?: string;
			auth?: AuthenticationMethod;
		}

		export interface SingleSourceRemoteDescriptor extends BaseSourceRemoteDescriptor {
			origin: string;
		}

		export interface MultiSourceRemoteDescriptor extends BaseSourceRemoteDescriptor {
			origins: { [name: string]: string };
		}

		export type SourceRemoteDescriptor = SingleSourceRemoteDescriptor | MultiSourceRemoteDescriptor;

		export function isSingleSourceRemoteDescriptor(remote: SourceRemoteDescriptor): remote is SingleSourceRemoteDescriptor {
			return (remote as SingleSourceRemoteDescriptor).origin != null;
		}

		export function isMultiSourceRemoteDescriptor(remote: SourceRemoteDescriptor): remote is MultiSourceRemoteDescriptor {
			return (remote as MultiSourceRemoteDescriptor).origins != null;
		}

		export interface RelativeRemoteDescriptor {
			path: string;
		}

		export type RemoteDescriptor = SourceRemoteDescriptor | RelativeRemoteDescriptor;

		export function isRelativeRemoteDescriptor(remote: RemoteDescriptor): remote is RelativeRemoteDescriptor {
			return (remote as RelativeRemoteDescriptor).path != null;
		}

		export abstract class RemoteLoader extends components.descriptor.BaseLoader<Descriptor> {
			protected cached: boolean;
			protected future: Future<Descriptor>;

			constructor(url: net.Url, cached: boolean) {
				super(url);
				this.cached = cached;
				this.future = new Future<Descriptor>();
			}

			public then(fn: (aDescriptor: Descriptor) => Descriptor): components.descriptor.Loader<Descriptor> {
				this.future = this.future.then<Descriptor>(fn);
				return this;
			}

			public catch(fn: (error: fugazi.Exception) => void): components.descriptor.Loader<Descriptor> {
				this.future = this.future.catch(fn);
				return this;
			}
		}

		export class HttpLoader extends RemoteLoader {
			constructor(url: net.Url, cached: boolean = true) {
				super(url, cached);

				url = url.clone();
				if (!cached) {
					url.addParam("dummy", new Date().getTime());
				}

				net.get({ url: url, cors: true })
					.success(this.loaded.bind(this))
					.fail(this.failed.bind(this))
					.send();
			}

			private loaded(response: net.HttpResponse): void {
				try {
					this.future.resolve(response.getDataAsJson());
				} catch (e) {
					this.future.reject(new fugazi.Exception("illegal module descriptor"));
				}
			}

			private failed(response: net.HttpResponse): void {
				this.future.reject(new fugazi.Exception(response.getData()));
			}
		}

		export class ScriptLoader extends RemoteLoader {
			private static LOADED_TIMEOUT: number = 1000;

			private loaded: boolean;
			private scriptId: string;
			private timer: utils.Timer;

			constructor(url: net.Url, cached: boolean = true) {
				super(url, cached);

				this.loaded = false;
				this.scriptId = utils.generateId({ prefix: "module_", min: 6, max: 10 });
				loadingScriptModules.set(this.scriptId, this);
				utils.loadScript(this.baseUrl.toString(), this.scriptId, this.cached).then(
					this.scriptLoaded.bind(this),
					this.failed.bind(this, "component loading timeout"));
			}

			public loadedCalled(moduleDescriptor: Descriptor): void {
				this.loaded = true;
				this.timer && this.timer.cancel();
				this.future.resolve(moduleDescriptor);
			}

			private scriptLoaded(): void {
				if (!this.loaded) {
					this.timer = new utils.Timer(ScriptLoader.LOADED_TIMEOUT, this.failed.bind(this, "component did not call loaded"));
				}
			}

			private failed(message: string): void {
				this.timer && this.timer.cancel();
				this.future.reject(new fugazi.Exception(message));
			}
		}
	}

	export namespace builder {
		function breakDescriptorWithPath(moduleDescriptor: descriptor.Descriptor) {
			let result: descriptor.Descriptor,
				path: string[] = moduleDescriptor.name.split(".");

			if (path.length === 1) {
				result = moduleDescriptor;
			} else {
				let first = path.remove(0),
					tail = path.join("."),
					innerModuleDescriptor = {} as descriptor.Descriptor;

				Object.keys(moduleDescriptor).forEach(key => innerModuleDescriptor[key] = moduleDescriptor[key]);
				innerModuleDescriptor.name = tail;

				result = {
					name: first,
					modules: [breakDescriptorWithPath(innerModuleDescriptor)]
				}
			}

			return result;
		}

		export function create(url: net.Url): components.builder.Builder<Module>;
		export function create(moduleDescriptor: descriptor.Descriptor, parent?: components.builder.Builder<components.Component>): components.builder.Builder<Module>;
		export function create(moduleDescriptor, parent?) {
			let loader: components.descriptor.Loader<descriptor.Descriptor>;

			if (moduleDescriptor instanceof net.Url) {
				if (moduleDescriptor.pathname.endsWith(".js")) {
					loader = new descriptor.ScriptLoader(moduleDescriptor);
				} else if (moduleDescriptor.pathname.endsWith(".json")) {
					loader = new descriptor.HttpLoader(moduleDescriptor);
				} else {
					throw new fugazi.Exception("can only load .js or .json urls");
				}
			} else {
				if (parent) {
					loader = new components.descriptor.ExistingLoader(moduleDescriptor, (<any> parent).loader.getUrl());
				} else {
					loader = new components.descriptor.ExistingLoader(moduleDescriptor);
				}
			}

			loader.then(aDescriptor => {
				const tree = breakDescriptorWithPath(aDescriptor);

				if (!parent) {
					(tree as any).basePath = aDescriptor.name;
				}

				return tree;
			});
			return new Builder(loader, parent);
		}

		interface RemoteBuilderInfo {
			path: Path;
			builder: Builder;
			name?: string;
		}

		export class Builder extends components.builder.BaseBuilder<Module, descriptor.Descriptor> {
			private innerModuleBuilders: collections.Map<components.builder.Builder<Module>>;
			private innerTypesBuilders: collections.Map<components.builder.Builder<types.Type>>;
			private innerCommandsBuilders: collections.Map<components.builder.Builder<commands.Command>>;
			private innerConvertersBuilders: collections.Map<components.builder.Builder<converters.Converter>>;
			private innerConstraintBuilders: collections.Map<components.builder.Builder<types.constraints.Constraint>>;

			private innerModuleRemoteBuilders: Array<RemoteBuilderInfo>;
			private innerTypeModuleRemoteBuilders: Array<RemoteBuilderInfo>;
			private innerCommandModuleRemoteBuilders: Array<RemoteBuilderInfo>;
			private innerConvertersModuleRemoteBuilders: Array<RemoteBuilderInfo>;
			private innerConstraintModuleRemoteBuilders: Array<RemoteBuilderInfo>;

			private basePath: Path;
			private remote: Remote;
			private params: Parameters;

			public constructor(loader: components.descriptor.Loader<descriptor.Descriptor>, parent?: components.builder.Builder<components.Component>) {
				super(Module, loader, parent);
			}

			public resolve<C2 extends Component>(type: ComponentType, name: string): C2 {
				var path: string[] = name.split("."),
					collection: collections.Map<components.builder.Builder<components.Component>> = null;

				if (path.length > 1) {
					if (this.getName() === path.first()) {
						name = name.substring(name.indexOf(".") + 1);
					} else if (this.innerModuleBuilders.has(path.first())) {
						return this.innerModuleBuilders.get(path.first()).resolve<C2>(type, name.substring(name.indexOf(".") + 1));
					}
				}

				switch (type) {
					case ComponentType.Type:
						collection = this.innerTypesBuilders;
						break;

					case ComponentType.Module:
						collection = this.innerModuleBuilders;
						break;

					case ComponentType.Command:
						collection = this.innerCommandsBuilders;
						break;

					case ComponentType.Converter:
						collection = this.innerConvertersBuilders;
						break;

					case ComponentType.Constraint:
						collection = this.innerConstraintBuilders;
						break;
				}

				if (collection !== null && collection.has(name)) {
					return <C2> collection.get(name).getComponent();
				}

				return super.resolve<C2>(type, name);
			}

			public getBasePath() {
				return this.getParent() ? (this.getParent() as Builder).getBasePath() : this.basePath;
			}

			protected onDescriptorReady(): void {
				this.createParameters();

				this.innerModuleRemoteBuilders = [];
				this.innerTypeModuleRemoteBuilders = [];
				this.innerCommandModuleRemoteBuilders = [];
				this.innerConvertersModuleRemoteBuilders = [];
				this.innerConstraintModuleRemoteBuilders = [];

				this.innerModuleBuilders = collections.map<components.builder.Builder<Module>>();
				this.innerTypesBuilders = collections.map<components.builder.Builder<types.Type>>();
				this.innerCommandsBuilders = collections.map<components.builder.Builder<commands.Command>>();
				this.innerConvertersBuilders = collections.map<components.builder.Builder<converters.Converter>>();
				this.innerConstraintBuilders = collections.map<components.builder.Builder<types.constraints.Constraint>>();

				if (!fugazi.isNothing(this.componentDescriptor.modules)) {
					this.createInnerModuleBuilders();
				}

				if (!fugazi.isNothing(this.componentDescriptor.constraints)) {
					this.createInnerConstraintBuilders();
				}

				if (!fugazi.isNothing(this.componentDescriptor.types)) {
					this.createInnerTypeBuilders();
				}

				if (!fugazi.isNothing(this.componentDescriptor.commands)) {
					this.createInnerCommandBuilders();
				}

				if (!fugazi.isNothing(this.componentDescriptor.converters)) {
					this.createInnerConvertersBuilders();
				}

				if ((<descriptor.Descriptor> this.componentDescriptor).remote) {
					const remote = <descriptor.RemoteDescriptor>(<descriptor.Descriptor> this.componentDescriptor).remote;

					this.handleRemoteDescriptor(remote);
				}

				if (!this.getParent()) {
					this.basePath = new Path(this.componentDescriptor.basePath);
				}
			}

			protected concreteBuild(): void {
				let innerBuilders = <Array<components.builder.Builder<components.Component>>> [].concat(this.innerModuleBuilders.values())
					.concat(this.innerCommandsBuilders.values())
					.concat(this.innerConstraintBuilders.values())
					.concat(this.innerTypesBuilders.values())
					.concat(this.innerConvertersBuilders.values());

				if (innerBuilders.length > 0) {
					innerBuilders.forEach(componentBuilder => {
						componentBuilder.build().then(this.innerBuilderCompleted.bind(this), this.future.reject);
						this.innerBuilderCreated();
					});
				} else if (this.component) {
					this.future.resolve(this.component);
				}

				this.innerModuleRemoteBuilders.forEach(pair => {
					pair.builder.build().then(this.remoteModuleBuilt.bind(this, pair, "module"), this.future.reject);
					this.innerBuilderCreated();
				});

				this.innerTypeModuleRemoteBuilders.forEach(pair => {
					pair.builder.build().then(this.remoteModuleBuilt.bind(this, pair, "type"), this.future.reject);
					this.innerBuilderCreated();
				});

				this.innerCommandModuleRemoteBuilders.forEach(pair => {
					pair.builder.build().then(this.remoteModuleBuilt.bind(this, pair, "command"), this.future.reject);
					this.innerBuilderCreated();
				});

				this.innerConvertersModuleRemoteBuilders.forEach(pair => {
					pair.builder.build().then(this.remoteModuleBuilt.bind(this, pair, "converter"), this.future.reject);
					this.innerBuilderCreated();
				});

				this.innerConstraintModuleRemoteBuilders.forEach(pair => {
					pair.builder.build().then(this.remoteModuleBuilt.bind(this, pair, "constraint"), this.future.reject);
					this.innerBuilderCreated();
				});
			}

			protected concreteAssociate(): void {
				(this.component as any).remote = this.remote;
				(this.component as any).params = this.params;

				this.innerModuleBuilders.forEach((moduleBuilder: Builder) => {
					if (isRemotePath(moduleBuilder.remote)) {
						(moduleBuilder.remote as any)._parent = this.remote;
					}
					moduleBuilder.associate();
					(<any> this).component.modules.set(moduleBuilder.getName(), moduleBuilder.getComponent());
				});

				this.innerConstraintBuilders.forEach(function(constraintBuilder: components.builder.Builder<types.constraints.Constraint>): void {
					constraintBuilder.associate();
					(<any> this).component.constraints.set(constraintBuilder.getName(), constraintBuilder.getComponent());
				}.bind(this));

				this.innerTypesBuilders.forEach(function(typeBuilder: components.builder.Builder<types.Type>): void {
					typeBuilder.associate();
					(<any> this).component.types.set(typeBuilder.getName(), typeBuilder.getComponent());
				}.bind(this));

				this.innerCommandsBuilders.forEach(function(commandBuilder: components.builder.Builder<commands.Command>): void {
					commandBuilder.associate();
					(<any> this).component.commands.set(commandBuilder.getName(), commandBuilder.getComponent());
				}.bind(this));

				this.innerConvertersBuilders.forEach(function(converterBuilder: components.builder.Builder<converters.Converter>): void {
					converterBuilder.associate();
					(<any> this).component.converters.set(converterBuilder.getName(), converterBuilder.getComponent());
				}.bind(this));
			}

			private createParameters() {
				this.params = new Parameters();

				if (this.componentDescriptor.lookup) {
					Object.keys(this.componentDescriptor.lookup).forEach(name => {
						(this.params as any).lookup.set(name, createLookup(this.componentDescriptor.lookup[name]));
					});
				}
			}

			private createInnerModuleBuilders() {
				if (fugazi.is(this.componentDescriptor.modules, Array)) {
					(<descriptor.InnerModulesArrayCollection> this.componentDescriptor.modules).forEach(current => {
						if (typeof current === "string") { // url
							this.innerModuleRemoteBuilders.push({ path: this.getPath().clone(), builder: <Builder> create(this.createInnerUrl(current)) });
						} else { // descriptor
							this.innerModuleBuilders.set(current.name, create(current, this));
						}
					});
				} else if (fugazi.isPlainObject(this.componentDescriptor.modules)) {
					Object.keys(this.componentDescriptor.modules).forEach(moduleName => {
						let moduleDescriptor = this.componentDescriptor.modules[moduleName];

						if (typeof moduleDescriptor === "string") { // url
							this.innerModuleRemoteBuilders.push({
								name: moduleName,
								path: this.getPath().clone(),
								builder: <Builder> create(this.createInnerUrl(moduleDescriptor))
							});
						} else { // descriptor
							moduleDescriptor.name = moduleName;
							this.innerModuleBuilders.set(moduleName, create(moduleDescriptor, this));
						}
					});
				} else {
					throw new components.builder.Exception("can only build inner modules from array or object collections");
				}
			}

			private createInnerCommandBuilders() {
				if (typeof this.componentDescriptor.commands === "string") { // url
					this.innerCommandModuleRemoteBuilders.push({ path: this.getPath().clone(), builder: <Builder> create(this.createInnerUrl(<string> this.componentDescriptor.commands)) });
				} else if (this.componentDescriptor.commands instanceof Array) {
					(<descriptor.InnerComponentsArrayCollection<commands.descriptor.Descriptor>> this.componentDescriptor.commands).forEach(current => {
						if (typeof current === "string") { // url
							this.innerCommandModuleRemoteBuilders.push({ path: this.getPath().clone(), builder: <Builder> create(this.createInnerUrl(current)) });
						} else { // descriptor
							this.innerCommandsBuilders.set(current.name, commands.builder.create(current, this));
						}
					});
				} else if (fugazi.isPlainObject(this.componentDescriptor.commands)) {
					Object.keys(this.componentDescriptor.commands).forEach(commandName => {
						let commandDescriptor = this.componentDescriptor.commands[commandName];

						if (typeof commandDescriptor === "string") { // url
							this.innerCommandModuleRemoteBuilders.push({
								name: commandName,
								path: this.getPath().clone(),
								builder: <Builder> create(this.createInnerUrl(commandDescriptor))
							});
						} else { // descriptor
							commandDescriptor.name = commandName;
							this.innerCommandsBuilders.set(commandName, commands.builder.create(commandDescriptor, this));
						}
					});
				} else {
					throw new components.builder.Exception("can only build commands from url string, array or object collections");
				}
			}

			private createInnerConvertersBuilders() {
				if (typeof this.componentDescriptor.converters === "string") { // url
					this.innerConvertersModuleRemoteBuilders.push({ path: this.getPath().clone(), builder: <Builder> create(this.createInnerUrl(<string> this.componentDescriptor.converters)) });
				} else if (this.componentDescriptor.converters instanceof Array) {
					(<descriptor.InnerComponentsArrayCollection<converters.descriptor.Descriptor>> this.componentDescriptor.converters).forEach(current => {
						if (typeof current === "string") { // url
							this.innerConvertersModuleRemoteBuilders.push({ path: this.getPath().clone(), builder: <Builder> create(this.createInnerUrl(current)) });
						} else { // descriptor
							this.innerConvertersBuilders.set(current.name, converters.builder.create(current, this));
						}
					});
				} else if (fugazi.isPlainObject(this.componentDescriptor.converters)) {
					Object.keys(this.componentDescriptor.converters).forEach(converterName => {
						let converterDescriptor = this.componentDescriptor.converters[converterName];

						if (typeof converterDescriptor === "string") { // url
							this.innerConvertersModuleRemoteBuilders.push({
								name: converterName,
								path: this.getPath().clone(),
								builder: <Builder> create(this.createInnerUrl(converterDescriptor))
							});
						} else { // descriptor
							converterDescriptor.name = converterName;
							this.innerConvertersBuilders.set(converterName, converters.builder.create(converterDescriptor, this));
						}
					});
				} else {
					throw new components.builder.Exception("can only build converters from url string, array or object collections");
				}
			}

			private createInnerConstraintBuilders() {
				if (typeof this.componentDescriptor.constraints === "string") { // url
					this.innerConstraintModuleRemoteBuilders.push({ path: this.getPath().clone(), builder: <Builder> create(this.createInnerUrl(<string> this.componentDescriptor.constraints)) });
				} else if (this.componentDescriptor.constraints instanceof Array) {
					(<descriptor.InnerComponentsArrayCollection<types.constraints.descriptor.Descriptor>> this.componentDescriptor.constraints).forEach(current => {
						if (typeof current === "string") { // url
							this.innerConstraintModuleRemoteBuilders.push({ path: this.getPath().clone(), builder: <Builder> create(this.createInnerUrl(current)) });
						} else { // descriptor
							this.innerConstraintBuilders.set(current.name, types.constraints.builder.create(current, this));
						}
					});
				} else if (fugazi.isPlainObject(this.componentDescriptor.constraints)) {
					Object.keys(this.componentDescriptor.constraints).forEach(constraintName => {
						let constraintDescriptor = this.componentDescriptor.constraints[constraintName];

						if (typeof constraintDescriptor === "string") { // url
							this.innerConstraintModuleRemoteBuilders.push({
								name: constraintName,
								path: this.getPath().clone(),
								builder: <Builder> create(this.createInnerUrl(constraintDescriptor))
							});
						} else { // descriptor
							constraintDescriptor.name = constraintName;
							this.innerConstraintBuilders.set(constraintName, types.constraints.builder.create(constraintDescriptor, this));
						}
					});
				} else {
					throw new components.builder.Exception("can only build constraints from url string, array or object collections");
				}
			}

			private createInnerTypeBuilders() {
				if (typeof this.componentDescriptor.types === "string") { // url
					this.innerTypeModuleRemoteBuilders.push({ path: this.getPath().clone(), builder: <Builder> create(this.createInnerUrl(<string> this.componentDescriptor.types)) });
				} else if (this.componentDescriptor.types instanceof Array) {
					(<descriptor.InnerComponentsArrayCollection<types.descriptor.Descriptor>> this.componentDescriptor.types).forEach(current => {
						if (typeof current === "string") { // url
							this.innerTypeModuleRemoteBuilders.push({ path: this.getPath().clone(), builder: <Builder> create(this.createInnerUrl(current)) });
						} else { // descriptor
							this.innerTypesBuilders.set(current.name, types.builder.create(current, this));
						}
					});
				} else if (fugazi.isPlainObject(this.componentDescriptor.types)) {
					Object.keys(this.componentDescriptor.types).forEach(typeName => {
						let typeDescriptor = this.componentDescriptor.types[typeName];

						if (typeof typeDescriptor === "string") { // url
							this.innerTypeModuleRemoteBuilders.push({
								name: typeName,
								path: this.getPath().clone(),
								builder: <Builder> create(this.createInnerUrl(typeDescriptor))
							});
						} else { // descriptor
							typeDescriptor.name = typeName;
							this.innerTypesBuilders.set(typeName, types.builder.create(typeDescriptor, this));
						}
					});
				} else {
					throw new components.builder.Exception("can only build constraints from url string, array or object collections");
				}
			}

			private createInnerUrl(path: string): net.Url {
				return this.loader.getUrlFor(path);
			}

			private remoteModuleBuilt(info: RemoteBuilderInfo, collectionType: components.ComponentTypeName): void {
				let newBuilder = info.builder;

				for (let i = 1; newBuilder != null && i < info.path.length; i++) {
					newBuilder = newBuilder.innerModuleBuilders.values()[0] as Builder;
				}

				if (newBuilder == null) {
					throw new components.builder.Exception(`remote module path doesn't match parent path 1`);
				}

				switch (collectionType) {
					case "module":
						newBuilder = <Builder> newBuilder.innerModuleBuilders.values()[0];
						if (newBuilder == null) {
							throw new components.builder.Exception(`remote module path doesn't match parent path 2`);
						}

						newBuilder.parent = this;
						this.innerModuleBuilders.set(info.name || info.builder.getName(), newBuilder);

						break;

					case "command":
						newBuilder.innerCommandsBuilders.values().forEach(commandBuilder => {
							(<any> commandBuilder).parent = this;
							this.innerCommandsBuilders.set(commandBuilder.getName(), commandBuilder);
						});

						break;

					case "type":
						newBuilder.innerTypesBuilders.values().forEach(typeBuilder => {
							(<any> typeBuilder).parent = this;
							this.innerTypesBuilders.set(typeBuilder.getName(), typeBuilder);
						});

						break;

					case "converter":
						newBuilder.innerConvertersBuilders.values().forEach(converterBuilder => {
							(<any> converterBuilder).parent = this;
							this.innerConvertersBuilders.set(converterBuilder.getName(), converterBuilder);
						});

						break;

					case "constraint":
						newBuilder.innerConstraintBuilders.values().forEach(constraintBuilder => {
							(<any> constraintBuilder).parent = this;
							this.innerConstraintBuilders.set(constraintBuilder.getName(), constraintBuilder);
						});

						break;
				}

				this.innerBuilderCompleted();
			}

			private handleRemoteDescriptor(remote: descriptor.RemoteDescriptor) {
				if (descriptor.isRelativeRemoteDescriptor(remote)) {
					this.handleRemoteRelativeDescriptor(remote);
				} else {
					this.handleRemoteSourceDescriptor(remote);
				}
			}

			private handleRemoteRelativeDescriptor(relative: descriptor.RelativeRemoteDescriptor) {
				this.remote = new RemotePath(relative.path);
			}

			private handleRemoteSourceDescriptor(source: descriptor.SourceRemoteDescriptor) {
				if (this.getParent() != null &&
					this.getParent().getComponent() != null &&
					(<Module> this.getParent().getComponent()).isRemote()) {

					throw new components.builder.Exception(
						`Contradicting 'remote' descriptions been detected on '${this.getPath()}' 
						and its parent module '${this.getParent().getPath()}'`);
				}

				this.remote = new RemoteSource(source);
				const loginCommandDescriptor = (this.remote as RemoteSource).loginCommandDescriptor();
				if (loginCommandDescriptor != null && Object.keys(loginCommandDescriptor).length > 0) {
					this.innerCommandsBuilders.set(loginCommandDescriptor.name, commands.builder.create(loginCommandDescriptor, this));
				}
			}
		}
	}
}