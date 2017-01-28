/// <reference path="../../../../scripts/bin/app/application.d.ts" />
/// <reference path="../../../../scripts/bin/components/components.d.ts" />
/// <reference path="../../../../scripts/bin/components/converters.d.ts" />

/**
 * Created by nitzan on 22/06/2016.
 */

(function(): void {
	fugazi.components.modules.descriptor.loaded({
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