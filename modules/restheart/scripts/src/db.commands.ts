/**
 * Created by nitzan on 07/01/2017.
 */

/// <reference path="../../../../scripts/bin/app/application.d.ts" />
/// <reference path="../../../../scripts/bin/app/modules.d.ts" />
/// <reference path="../../../../scripts/bin/components/components.d.ts" />
/// <reference path="../../../../scripts/bin/components/converters.d.ts" />

(function(): void {
	fugazi.components.modules.descriptor.loaded({
		name: "restheart.databases",
		commands: {
			use: {
				title: "select a db",
				returns: "ui.message",
				parametersForm: "arguments",
				syntax: "use (dbname string)",
				handler: (context: fugazi.app.modules.ModuleContext, dbname: string) => {
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