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
			},
			extract: {
				title: "returns an item inside a compound type",
				syntax: [
					"extract (index string) from (value map)",
					"extract (index number[numbers.integer]) from (value list)",
				],
				returns: "any",
				parametersForm: "arguments",
				handler: function(context: fugazi.app.modules.ModuleContext, index: string | number, value: any[] | fugazi.collections.Map<any>) {
					if (typeof index === "string" && value instanceof fugazi.collections.Map) {
						if (value.has(index)) {
							return value.get(index);
						}

						const path = index.split(".");
						if (path.length > 1) {
							let result: any = value;

							while (result instanceof fugazi.collections.Map && !path.empty() && result.has(path.first())) {
								result = result.get(path.remove(0));
							}

							if (path.empty() && result !== undefined) {
								return result;
							}
						}

						throw new fugazi.Exception("index not found");
					} else if (typeof index === "number" && value instanceof Array) {
						if (index < 0 || index >= value.length) {
							throw new fugazi.Exception("index out of bound");
						}

						return value[index];
					}

					throw new fugazi.Exception("params must be string|map or number|list");
				}
			}
		}
	});
})();