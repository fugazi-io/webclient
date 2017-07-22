import {
	Component,
	Descriptor,
	LoadProperties,
	Module,
	ModuleContext,
	PrivilegedModuleContext
} from "../../../../scripts/bin/app/modules.api";

(function (): void {
	interface ComponentStruct {
		name: string;
		title?: string;
		description?: string;
	}

	interface ModuleStruct extends ComponentStruct {
		types: ComponentStruct[];
		constraints: ComponentStruct[];
		commands: ComponentStruct[];
		modules: ModuleStruct[];
	}

	function componentToStruct(aComponent: Component): ComponentStruct {
		return {
			name: aComponent.getName(),
			title: aComponent.getTitle() || aComponent.getName(),
			description: aComponent.getDescription() || ""
		};
	}

	function moduleToStruct(aModule: Module): ModuleStruct {
		var struct: ModuleStruct = <ModuleStruct> componentToStruct(aModule);

		struct.modules = aModule.getModules().map(moduleToStruct);
		struct.types = aModule.getTypes().map(componentToStruct);
		struct.constraints = aModule.getConstraints().map(componentToStruct);
		struct.commands = aModule.getCommands().map(componentToStruct);

		return struct;
	}

	fugazi.loaded(<Descriptor> {
		name: "io.fugazi.components",
		commands: {
			load: {
				title: "Load Module",
				async: true,
				returns: "ui.message",
				parametersForm: "struct",
				syntax: "load module from (url net.url)",
				componentConstructor: fugazi.terminal.TerminalCommand,
				handler: function (context: PrivilegedModuleContext, props: LoadProperties): Promise<string> {
					return fugazi.registry.load(props).then<string>(loadedModule => {
						context.getParent().getTerminal().moduleLoaded(loadedModule);
						return "module " + loadedModule.getPath().toString() + " loaded";
					});
				}
			},
			listModules: {
				title: "List Modules",
				returns: "list<module>",
				parametersForm: "struct",
				syntax: [
					"list modules",
					"list modules in (path path)"
				],
				handler: function (context: ModuleContext, props: { path?: string }): ModuleStruct[] {
					return fugazi.registry.getModules(props.path).map(moduleToStruct);
				}
			},
			listTypes: {
				title: "List Types",
				returns: "list<component>",
				parametersForm: "struct",
				syntax: "list types in (path path)",
				handler: function (context: ModuleContext, props: { path: string }): ComponentStruct[] {
					return fugazi.registry.getModule(props.path).getTypes().map(componentToStruct);
				}
			},
			listConstraints: {
				title: "List Constraints",
				returns: "list<component>",
				parametersForm: "struct",
				syntax: "list constraints in (path path)",
				handler: function (context: ModuleContext, props: { path: string }): ComponentStruct[] {
					return fugazi.registry.getModule(props.path).getConstraints().map(componentToStruct);
				}
			},
			listCommands: {
				title: "List Commands",
				returns: "list<component>",
				parametersForm: "struct",
				syntax: "list commands in (path path)",
				handler: function (context: ModuleContext, props: { path: string }): ComponentStruct[] {
					return fugazi.registry.getModule(props.path).getCommands().map(componentToStruct);
				}
			},
			listConverters: {
				title: "List Converters",
				returns: "list<component>",
				parametersForm: "struct",
				syntax: "list converters in (path path)",
				handler: function (context: ModuleContext, props: { path: string }): ComponentStruct[] {
					return fugazi.registry.getModule(props.path).getConverters().map(componentToStruct);
				}
			}
		}
	});
})();