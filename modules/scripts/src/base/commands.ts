import {Component, Descriptor, Map, ModuleContext} from "../../../../scripts/bin/app/modules.api";


(function (): void {
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

	fugazi.loaded(<Descriptor> {
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
				handler: function (context: ModuleContext, value: any) {
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
				handler: function (context: ModuleContext, value: string) {
					let components: Component[];

					if (value.indexOf(".") > 0) {
						components = [fugazi.registry.getUnknown(value)];
					} else {
						components = fugazi.registry.findCommand(value);
					}

					if (!components || components.length === 0) {
						return {
							status: fugazi.handler.ResultStatus.Failure,
							error: `couldn't find component "${ value }"`
						}
					}

					let markdown = components[0].getManual();

					if (!markdown) {
						return {
							status: fugazi.handler.ResultStatus.Failure,
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
				handler: function (context: ModuleContext) {
					return fugazi.version.toString();
				}
			},
			extract: {
				title: "returns an item inside a compound type",
				syntax: [
					"(value map) . (index string)",
					"(value map) (index list<string>)",
					"extract (index string) from (value map)",
					"(value list) (index list<number[numbers.integer]>)",
					"extract (index number[numbers.integer]) from (value list)",
				],
				returns: "any",
				parametersForm: "map",
				handler: function (context: ModuleContext, params: Map<any>) {
					let index: string | [string] | number | [number] = params.get("index");
					let value: any[] | Map<any> = params.get("value");

					if (fugazi.isPlainObject(value)) {
						value = fugazi.collections.map(value);
					}

					if ((typeof index === "string" || (index instanceof Array && typeof index[0] === "string")) && value instanceof fugazi.collections.Map) {
						if (index instanceof Array) {
							index = index.join(".");
						}

						if (value.has(index as string)) {
							return value.get(index as string);
						}

						const path = (index as string).split(".");
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
					} else if ((typeof index === "number" || (index instanceof Array && typeof index[0] === "number")) && value instanceof Array) {
						if (index instanceof Array) {
							index = index[0];
						}

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
				handler: function (context: ModuleContext, value: string) {
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
				handler: function (context: ModuleContext, value: any) {
					return JSON.stringify(fugaziToJson(value));
				}
			}
		}
	});
})();