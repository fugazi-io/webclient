import {Descriptor, ModuleContext, Module, Component, Map, PrivilegedModuleContext, LoadProperties} from "../../../../scripts/bin/app/modules.api";

(function(): void {
	fugazi.loaded({
		name: "io.fugazi",
		converters: {
			string2boolean: {
				title: "converts string to boolean",
				input: "string",
				output: "boolean",
				converter: function(input: string): boolean {
					if (input.test(/^true$/i)) {
						return true;
					}

					if (input.test(/^false$/i)) {
						return false;
					}

					return null;
				}
			},
			string2number: {
				title: "converts string to number",
				input: "string",
				output: "number",
				converter: function(input: string): number {
					return parseFloat(input);
				}
			}
		}
	});
})();