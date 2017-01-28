/// <reference path="../../../../scripts/bin/app/application.d.ts" />
/// <reference path="../../../../scripts/bin/components/components.d.ts" />

/**
 * Created by nitzan on 07/06/2016.
 */

(function(): void {
	fugazi.components.modules.descriptor.loaded(<fugazi.components.modules.descriptor.Descriptor> {
		name: "io.fugazi",
		commands: {
			echo: {
				title: "echo input",
				syntax: "echo (value any)",
				returns: "any",
				parametersForm: "arguments",
				handler: function(context: fugazi.app.modules.ModuleContext, value: any) {
					return value;
				}
			},
			version: {
				title: "show fugazi client version",
				syntax: "version",
				returns: "ui.message",
				handler: function(context: fugazi.app.modules.ModuleContext) {
					return fugazi.app.version.toString();
				}
			}
		}
	});
})();