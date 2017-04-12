/// <reference path="../../../../scripts/bin/app/application.d.ts" />
/// <reference path="../../../../scripts/bin/components/registry.d.ts" />
/// <reference path="../../../../scripts/bin/components/components.d.ts" />

/**
 * Created by nitzan on 07/06/2016.
 */

(function(): void {
	let echoExamples = "#### Examples:\n";
	echoExamples += "```fugazi-command\n// command\necho hey\n//output\n\"hey\"\n```\n\n";
	echoExamples += "```fugazi-command\n// command\necho [1, 2, hey]\n// output\nlist [\n\t1\n\t2\n\t\"hey\"\n]```\n\n";

	let manExamples = "#### Examples:\n";
	manExamples += "```fugazi-commands\n// command\nman echo\n// command\nman http\n// command\nman \"io.fugazi.strings\"\n```\n\n";

	function jsonToFugazi(value: any): any {
		if (typeof value !== "object" || value === null || fugazi.is(value, Array)) {
			return value;
		} else {
			return fugazi.collections.map(value);
		}
	}

	function fugaziToJson(value: any): any {
		if (value instanceof fugazi.collections.Map) {
			return value.asObject();
		} else if (fugazi.is(value, Array)) {
			return value.map(v => fugaziToJson(v));
		} else {
			return value;
		}
	}

	fugazi.components.modules.descriptor.loaded(<fugazi.components.modules.descriptor.Descriptor> {
		name: "io.fugazi",
		commands: {
			echo: {
				title: "echo input",
				syntax: "echo (value any)",
				returns: "any",
				parametersForm: "arguments",
				manual: {
					method: "append",
					markdown: echoExamples
				},
				handler: function(context: fugazi.app.modules.ModuleContext, value: any) {
					return value;
				}
			},
			manual: {
				title: "Manual of a component",
				syntax: [
					"man (command string)",
					"man (path components.path)"
				],
				returns: "ui.markdown",
				parametersForm: "arguments",
				manual: {
					method: "append",
					markdown: manExamples
				},
				handler: function(context: fugazi.app.modules.ModuleContext, value: string) {
					let components: fugazi.components.Component[];

					if (value.indexOf(".") > 0) {
						components = [fugazi.components.registry.getUnknown(value)];
					} else {
						components = fugazi.components.registry.findCommand(value);
					}

					if (!components || components.length === 0) {
						return {
							status: fugazi.components.commands.handler.ResultStatus.Failure,
							error: `couldn't find component "${ value }"`
						}
					}

					let markdown = components[0].getManual();

					if (!markdown) {
						return {
							status: fugazi.components.commands.handler.ResultStatus.Failure,
							error: `"${ value }" has no manual`
						}
					}

					return markdown;
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
					if (fugazi.isPlainObject(value)) {
						value = fugazi.collections.map(value);
					}

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
			},
			jsonParse: {
				title: "parse input as json",
				syntax: [
					"jsonParse (value string)",
					"json parse (value string)"
				],
				returns: "any",
				parametersForm: "arguments",
				handler: function(context: fugazi.app.modules.ModuleContext, value: string) {
					try {
						return jsonToFugazi(JSON.parse(value));
					} catch (e) {
						return jsonToFugazi(JSON.parse(`"${ value }"`));
					}
				}
			},
			jsonStringify: {
				title: "stringify input to json",
				syntax: [
					"jsonStringify (value any)",
					"json stringify (value any)"
				],
				returns: "string",
				parametersForm: "arguments",
				handler: function(context: fugazi.app.modules.ModuleContext, value: any) {
					return JSON.stringify(fugaziToJson(value));
				}
			}
		}
	});
})();