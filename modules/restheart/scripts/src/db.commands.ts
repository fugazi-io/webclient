import {BoundConstraintValidator, HttpMethod, Descriptor, ModuleContext, Module, Component, Map, RequestProperties, PrivilegedModuleContext, LoadProperties} from "../../../../scripts/bin/app/modules.api";

(function(): void {
	fugazi.loaded({
		name: "restheart.databases",
		commands: {
			use: {
				title: "select a db",
				returns: "ui.message",
				parametersForm: "arguments",
				syntax: "use (dbname string)",
				handler: (context: ModuleContext, dbname: string) => {
					if (context.data.has("default.db")) {
						console.log(`previous default db: ${ context.data.get("default.db") }`);
					}

					context.data.set("default.db", dbname);
					return `default selected database set to "${ dbname }"`;
				}
			}
		}
	});
})();