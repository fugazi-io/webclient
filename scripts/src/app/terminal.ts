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
import * as semantics from "../app/semantics";

export interface Properties {
	name: string;
	title?: string;
	description?: string;
	history?: string[];
}

export class SuggestionsAmbiguityResolver implements viewTerminal.AmbiguityResolver {
	public resolve(ambiguousSet: semantics.PossibleInterpretation[]): commands.ExecutionResult {
		return null;
	}
}

export abstract class BaseTerminalContext extends app.BaseContext<app.ApplicationContext> {
	private moduleToRemoteId: collections.FugaziMap<string>;

	constructor(parent: app.ApplicationContext, id?: string) {
		super(parent, id);
		this.moduleToRemoteId = new collections.FugaziMap<string>();
	}

	public setRemoteSource(modulePath: components.Path, remoteId: string): void {
		this.moduleToRemoteId.set(modulePath.toString(), remoteId);
	}

	public getRemoteSource(modulePath: components.Path): string {
		let id: string = this.moduleToRemoteId.get(modulePath.toString());

		if (!coreTypes.isNull(id) || modulePath.first() == modulePath.last()) {
			return id;
		}

		return this.getRemoteSource(modulePath.parent());
	}
}

export class TerminalContext extends BaseTerminalContext {
	private terminal: Terminal;

	constructor(terminal: Terminal, parent: app.ApplicationContext) {
		super(parent);
		this.terminal = terminal;
	}

	public getTerminal(): Terminal {
		return this.terminal;
	}

	public asRestricted(): RestrictedTerminalContext {
		let context = new RestrictedTerminalContext(this.getParent(), this.getId());
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

export class Terminal {
	private properties: Properties;
	private view: viewTerminal.TerminalView;
	private context: TerminalContext;
	private contextProvider: ContextProvider;
	private modules: Map<string, LoadedModule>;
	private variables: collections.FugaziMap<app.Variable>;

	constructor(properties: Properties, applicationContext: app.ApplicationContext, viewFactory: viewTerminal.TerminalFactory) {
		this.properties = properties;
		this.modules = new Map();
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
			history: this.properties.history,
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

	private setView(view: viewTerminal.TerminalView): void {
		this.view = view;
	}

	private executeCommand(command: string): commands.ExecutionResult {
		ga("send", "event", "Commands", "execution - start", command);
		storage.local.store(this.properties.name, this.properties);

		let result: commands.ExecutionResult;
		let session = statements.createStatementsSession(command, this.contextProvider);

		try {
			result = this.executeCommandInSession(new SuggestionsAmbiguityResolver(), session);

		} catch (e) {
			const error = typeof e === "string" ? e : (e.message ? e.message : e.toString());
			ga("send", "event", "Commands", "execution - error: " + error, command);

			result = new commands.ExecutionResult(registry.getType("any"), false);
			result.reject(e);
		}

		return result;
	}

	private executeCommandInSession(resolver: viewTerminal.AmbiguityResolver, session: statements.StatementSession): commands.ExecutionResult {
		let result: commands.ExecutionResult;
		try {
			let executableStatement = session.getExecutable();
			result = executableStatement.execute();

		} catch (e) {
			if (e instanceof statements.AmbiguityStatementException) {
				let ase = e as statements.AmbiguityStatementException;
				resolver.resolve(ase.getAmbiguousMatches())
					.then(selection => {
						session.pinInterpretation(ase.getAmbiguousExpression().range, selection);
						result = this.executeCommandInSession(resolver, session);
					});

			} else {
				throw e;
			}
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
	let coreCommands = {
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

	let moduleBuilder = modulesBuilder.create(coreCommands) as modulesBuilder.Builder;
	moduleBuilder.build().then((aModule: componentsModules.Module) => {
		moduleBuilder.associate();
		registry.add(aModule);
	}).catch(e => {
		throw e
	});
});
