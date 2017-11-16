import * as bus from "./application.bus";
import * as storage from "./storage";
import * as statements from "./statements";
import * as modules from "./modules";
import * as viewTerminal from "../view/terminal";
import * as constants from "./constants";
import * as app from "./application";
import * as collections from "../core/types.collections";
import * as coreTypes from "../core/types";
import * as components from "../components/components";
import * as registry from "../components/registry";
import * as componentsModules from "../components/modules";
import * as modulesBuilder from "../components/modules.builder";
import * as types from "../components/types";
import * as commands from "../components/commands";
import * as handler from "../components/commands.handler";

export interface Properties {
	name: string;
	title?: string;
	description?: string;
	history?: string[];
}

export abstract class BaseTerminalContext extends app.BaseContext<app.ApplicationContext> {
	private moduleToRemoteId: Map<string, string>;

	protected terminal: Terminal;

	constructor(terminal: Terminal, parent: app.ApplicationContext, id?: string) {
		super(parent, id);
		this.terminal = terminal;
		this.moduleToRemoteId = new Map<string, string>();
	}

	public setRemoteSource(modulePath: components.Path, remoteId: string): void {
		this.moduleToRemoteId.set(modulePath.toString(), remoteId);
	}

	public getRemoteSource(modulePath: components.Path): string {
		const id: string = this.moduleToRemoteId.get(modulePath.toString());

		if (!coreTypes.isNull(id) || modulePath.first() == modulePath.last()) {
			return id;
		}

		return this.getRemoteSource(modulePath.parent());
	}

	public getUIServiceProvider(): app.UIServiceProvider {
		return this.terminal;
	}
}

export class TerminalContext extends BaseTerminalContext {
	public getTerminal(): Terminal {
		return this.terminal;
	}

	public asRestricted(): RestrictedTerminalContext {
		const context = new RestrictedTerminalContext(this.terminal, this.getParent(), this.getId());
		Object.seal(context);
		return context;
	}

	public isVariableReference(value: string): boolean {
		return value.startsWith("$");
	}

	public hasVariable(name: string): boolean {
		return !coreTypes.isUndefined(this.terminal.retrieveVariable(name));
	}

	public storeVariable(name: string, type: types.Type, value: any): app.Variable {
		return this.terminal.storeVariable(name, type, value);
	}

	public retrieveVariable(name: string): app.Variable {
		return this.terminal.retrieveVariable(name);
	}

	public clearOutput(): void {
		this.terminal.clearOutput();
	}
}

export class RestrictedTerminalContext extends BaseTerminalContext {}

export class TerminalCommand extends commands.LocalCommand {
	constructor() {
		super();
	}

	public isRestricted(): boolean {
		return false;
	}
}

type LoadedModule = {
	module: componentsModules.Module;
	context: {
		restricted: modules.ModuleContext,
		privileged: modules.PrivilegedModuleContext
	};
};

export type ContextProvider = {
	terminal: () => TerminalContext;
	module: {
		restricted: (path: components.Path) => modules.ModuleContext;
		privileged: (path: components.Path) => modules.PrivilegedModuleContext;
	}
}

function moduleContextProvider(this: { modules: Map<string, LoadedModule> }, type: "restricted" | "privileged", path: components.Path) {
	while (path.length > 0) {
		const key = path.toString();

		if (this.modules.has(key)) {
			return this.modules.get(key).context[type];
		}

		path = path.parent();
	}

	return null;
}

export type UIServicePromptInputTypes = "boolean" | "text" | "password" | "select";
export type UIServiceObjTypes<T> = types.Type | [string, string] | string[] | Map<T, string>;

export class History {
	private originals: string[];
	private cache: string[];
	private cursor: number;

	public constructor(loaded?: string[]) {
		this.originals = loaded || [];
		this.reset();
	}

	public clear(): void {
		this.originals = [];
		this.reset();
	}

	public mark(value: string): void {
		if (this.originals.first() !== value) {
			this.originals.unshift(value);
		}

		this.reset();
	}

	public update(value: string): void {
		if (value.trim() !== "") {
			this.cache[this.cursor] = value;
		}
	}

	public previous(): string | null {
		if (this.cursor === this.cache.length - 1) {
			return null;
		}

		return this.cache[++this.cursor];
	}

	public next(): string | null {
		if (this.cursor == 0) {
			return null;
		}

		return this.cache[--this.cursor];
	}

	public items(): string[] {
		return this.originals.slice(0);
	}

	private reset(): void {
		this.cursor = 0;
		this.cache = this.originals.clone();
		this.cache.unshift("");
	}
}

export class Terminal implements app.UIServiceProvider {
	private history: History;
	private properties: Properties;
	private view: viewTerminal.TerminalView;
	private context: TerminalContext;
	private contextProvider: ContextProvider;
	private modules: Map<string, LoadedModule>;
	private variables: collections.FugaziMap<app.Variable>;

	constructor(properties: Properties, applicationContext: app.ApplicationContext, viewFactory: viewTerminal.TerminalFactory) {
		this.properties = properties;
		this.modules = new Map();
		this.history = new History(properties.history);
		this.variables = collections.map<app.Variable>();
		this.context = new TerminalContext(this, applicationContext);
		this.contextProvider = {
			terminal: () => this.context,
			module: {
				restricted: moduleContextProvider.bind(this, "restricted"),
				privileged: moduleContextProvider.bind(this, "privileged")
			}
		}

		this.moduleLoaded(registry.getModule("io.fugazi"));

		viewFactory.createTerminal({
			name: properties.name,
			title: properties.title || properties.name,
			description: properties.description,
			history: this.history,
			querier: this.queryForStatements.bind(this),
			executer: this.executeCommand.bind(this)
		}).then(this.setView.bind(this));
	}

	public clearOutput(): void {
		this.view.clearOutput();
	}

	public moduleLoaded(module: componentsModules.Module) {
		const path = module.getPath().toString();

		if (!this.modules.has(path)) {
			this.modules.set(path, {
				module,
				context: {
					restricted: new modules.ModuleContext(this.context.asRestricted()),
					privileged: new modules.PrivilegedModuleContext(this.context)
				}
			});
		}
	}

	public storeVariable(name: string, type: types.Type, value: any): app.Variable {
		let variable = {
			name: extractVariableName(name),
			type: type,
			value: value
		};

		this.variables.set(variable.name, variable);
		return variable;
	}

	public retrieveVariable(name: string): app.Variable {
		return this.variables.get(extractVariableName(name));
	}

	public promptFor<T>(message: string, input: UIServicePromptInputTypes = "text", obj?: UIServiceObjTypes<T>): Promise<T> {
		throw new Error("Method not implemented.");
	}

	private setView(view: viewTerminal.TerminalView): void {
		this.view = view;
	}

	private executeCommand(command: string): commands.ExecutionResult {
		ga("send", "event", "Commands", "execution - start", command);
		storage.local.store(this.properties.name, this.properties);

		let result: commands.ExecutionResult = null;
		try {
			let session = statements.createStatementsSession(command, this.contextProvider),
				executableStatement = session.getExecutable();

			if (!coreTypes.isNull(executableStatement)) {
				result = executableStatement.execute();
			} else {
				ga("send", "event", "Commands", "execution - None of the statements are executable", command);
				throw new coreTypes.Exception("None of the statements are executable");
			}
		} catch (e) {
			const error = typeof e === "string" ? e : (e.message ? e.message : e.toString());
			ga("send", "event", "Commands", "execution - error: " + error, command);
			result = new commands.ExecutionResult(registry.getType("any"), false);
			result.reject(e);
		}

		return result;
	}

	private queryForStatements(command: string, position: number): Promise<statements.Statement[]> {
		let future = new coreTypes.Future<statements.Statement[]>(),
			session = statements.createStatementsSession(command, this.contextProvider),
			suggestedStatements = session.getSuggestions(position);

		future.resolve(suggestedStatements);

		return future.asPromise();
	}
}

function extractVariableName(input: string): string {
	return input.startsWith("$") ? input.substring(1) : input;
}

// init
bus.register(constants.Events.Ready, function (): void {
	const coreCommands = {
		name: "io.fugazi.terminal",
		title: "Terminal Module",
		constraints: {
			variable: {
				title: "Variable name constraint",
				types: ["string"],
				params: [],
				validator: () => {
					return function (value: string): boolean {
						return /^\$[^"':\[]\(\)\{}]+$/.test(value);
					}
				}
			}
		},
		types: {
			"variable": {
				title: "Variable Token",
				type: "string[variable]"
			}
		},
		commands: {
			clear: {
				title: "Clears the output panel",
				syntax: "clear",
				returns: "void",
				componentConstructor: TerminalCommand,
				handler: function (context: modules.PrivilegedModuleContext): handler.Result {
					context.getParent().clearOutput();
					return {
						status: handler.ResultStatus.Success
					}
				}
			},
			assign: {
				title: "Variable assignment command",
				syntax: [
					"(name string) = (value any)",
					"set (name string) = (value any)",
					"let (name string) = (value any)"
				],
				returns: "void",
				parametersForm: "arguments",
				componentConstructor: TerminalCommand,
				handler: function (context: modules.PrivilegedModuleContext, name: string, value: any): handler.Result {
					let type = context.guessType(value);
					if (type == null) {
						return {
							status: handler.ResultStatus.Failure,
							error: "can't guess type"
						}
					}

					context.getParent().storeVariable(name, type, value);
					return {
						status: handler.ResultStatus.Success
					};
				}
			},
			moduleWorkWith: {
				title: "Specific module remote source setup",
				syntax: [
					"module (moduleName string) works with (source string)",
				],
				returns: "ui.message",
				parametersForm: "arguments",
				componentConstructor: TerminalCommand,
				handler: function (context: modules.ModuleContext, moduleName: string, source: string): handler.Result {
					let theModule: componentsModules.Module = registry.getModule(moduleName);
					if (coreTypes.isNothing(theModule)) {
						return {
							status: handler.ResultStatus.Failure,
							error: `No such module '${moduleName}'`
						}
					} else if (coreTypes.isNothing(theModule.getRemote().base(source))) {
						return {
							status: handler.ResultStatus.Failure,
							error: `Module '${moduleName}' has no remote description for '${ source}'`
						}
					} else {
						context.getParent().setRemoteSource(theModule.getPath(), source);
						return {
							status: handler.ResultStatus.Success,
							value: `set '${moduleName}' to work with remote source '${source}'`
						}
					}
				}
			}
		}
	};

	const moduleBuilder = modulesBuilder.create({
		promptFor: () => {
			throw new Error("ui provider not implemented");
		}
	}, coreCommands) as modulesBuilder.Builder;
	moduleBuilder.build().then((aModule: componentsModules.Module) => {
		moduleBuilder.associate();
		registry.add(aModule);
	}).catch(e => {
		throw e
	});
});
