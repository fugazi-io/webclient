/// <reference path="./input.ts" />
/// <reference path="./modules.ts" />
/// <reference path="./statements.ts" />
/// <reference path="./application.ts" />
/// <reference path="../components/types.ts" />
/// <reference path="../components/commands.ts" />
/// <reference path="../components/modules.ts" />
/// <reference path="../components/registry.ts" />
/// <reference path="../view/terminal.tsx" />

module fugazi.app.terminal {
	export interface Properties {
		name: string;
		title?: string;
		description?: string;
		history?: string[];
	}

	export abstract class BaseTerminalContext extends BaseContext<ApplicationContext> {
		private moduleToRemoteId: collections.Map<string>;

		constructor(parent: ApplicationContext, id?: string) {
			super(parent, id);
			this.moduleToRemoteId = new collections.Map<string>();
		}

		public setRemoteSource(modulePath: components.Path, remoteId: string): void {
			this.moduleToRemoteId.set(modulePath.toString(), remoteId);
		}

		public getRemoteSource(modulePath: components.Path): string {
			let id: string = this.moduleToRemoteId.get(modulePath.toString());

			if (!isNull(id) || modulePath.first() == modulePath.last()) {
				return id;
			}

			return this.getRemoteSource(modulePath.parent());
		}
	}

	export class TerminalContext extends BaseTerminalContext {
		private terminal: Terminal;

		constructor(terminal: Terminal, parent: ApplicationContext) {
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
			return !fugazi.isUndefined(this.terminal.retrieveVariable(name));
		}

		public storeVariable(name: string, type: components.types.Type, value: any): Variable {
			return this.terminal.storeVariable(name, type, value);
		}

		public retrieveVariable(name: string): Variable {
			return this.terminal.retrieveVariable(name);
		}

		public clearOutput(): void {
			this.terminal.clearOutput();
		}
	}

	export class RestrictedTerminalContext extends BaseTerminalContext {}

	export class TerminalCommand extends components.commands.LocalCommand {
		constructor() {
			super();
		}

		public isRestricted(): boolean {
			return false;
		}
	}

	type LoadedModule = {
		module: components.modules.Module;
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
		private view: view.TerminalView;
		private context: TerminalContext;
		private contextProvider: ContextProvider;
		private modules: Map<string, LoadedModule>;
		private variables: collections.Map<Variable>;

		public constructor(properties: Properties, applicationContext: ApplicationContext, viewFactory: view.TerminalFactory) {
			this.properties = properties;
			this.modules = new Map();
			this.variables = collections.map<Variable>();
			this.context = new TerminalContext(this, applicationContext);
			this.contextProvider = {
				terminal: () => this.context,
				module: {
					restricted: moduleContextProvider.bind(this, "restricted"),
					privileged: moduleContextProvider.bind(this, "privileged")
				}
			}

			this.moduleLoaded(components.registry.getModule("io.fugazi"));

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

		public moduleLoaded(module: components.modules.Module) {
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

		public storeVariable(name: string, type: components.types.Type, value: any): Variable {
			let variable = {
				name: extractVariableName(name),
				type: type,
				value: value
			};

			this.variables.set(variable.name, variable);
			return variable;
		}

		public retrieveVariable(name: string): Variable {
			return this.variables.get(extractVariableName(name));
		}

		private setView(view: view.TerminalView): void {
			this.view = view;
		}

		private executeCommand(command: string): components.commands.ExecutionResult {
			storage.local.store(this.properties.name, this.properties);

			let result: components.commands.ExecutionResult = null;
			try {
				let session: statements.StatementSession = statements.createStatementsSession(command, this.contextProvider),
					executableStatement: statements.Statement = session.getExecutable();

				if (!isNull(executableStatement)) {
					result = executableStatement.execute();
				} else {
					throw new Exception("None of the statements are executable");
				}

			} catch (e) {
				result = new components.commands.ExecutionResult(components.registry.getType("any"), false);
				result.reject(e);
			}

			return result;
		}
		
		private queryForStatements(command: string, position: number): Promise<app.statements.Statement[]> {
			let future = new Future<app.statements.Statement[]>(),
				session: statements.StatementSession = statements.createStatementsSession(command, this.contextProvider),
				suggestedStatements: statements.Statement[] = session.getSuggestions(position);

			future.resolve(suggestedStatements);
			
			return future.asPromise();
		}
	}

	function extractVariableName(input: string): string {
		return input.startsWith("$") ? input.substring(1) : input;
	}

	// init
	app.bus.register(app.Events.Ready, function(): void {
		let coreCommands = {
			name: "io.fugazi.terminal",
			title: "Terminal Module",
			constraints: {
				variable: {
					title: "Variable name constraint",
					types: ["string"],
					params: [],
					validator: () => {
						return function(value: string): boolean {
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
					handler: function(context: modules.PrivilegedModuleContext): components.commands.handler.Result {
						context.getParent().clearOutput();
						return {
							status: components.commands.handler.ResultStatus.Success
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
					handler: function(context: modules.PrivilegedModuleContext, name: string, value: any): components.commands.handler.Result {
						let type = context.guessType(value);
						if (type == null) {
							return {
								status: components.commands.handler.ResultStatus.Failure,
								error: "can't guess type"
							}
						}

						context.getParent().storeVariable(name, type, value);
						return {
							status: components.commands.handler.ResultStatus.Success
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
					handler: function (context: modules.ModuleContext, moduleName: string, source: string): components.commands.handler.Result {
						let theModule: components.modules.Module = components.registry.getModule(moduleName);
						if (isNothing(theModule)) {
							return {
								status: components.commands.handler.ResultStatus.Failure,
								error: `No such module '${moduleName}'`
							}
						} else if (isNothing(theModule.getRemote().base(source))) {
							return {
								status: components.commands.handler.ResultStatus.Failure,
								error: `Module '${moduleName}' has no remote description for '${ source}'`
							}
						} else {
							context.getParent().setRemoteSource(theModule.getPath(), source);
							return {
								status: components.commands.handler.ResultStatus.Success,
								value: `set '${moduleName}' to work with remote source '${source}'`
							}
						}
					}
				}
			}
		};

		let moduleBuilder = components.modules.builder.create(coreCommands) as components.modules.builder.Builder;
		moduleBuilder.build().then((aModule: components.modules.Module) => {
			moduleBuilder.associate();
			components.registry.add(aModule);
		}).catch(e => { throw e });
	});
}