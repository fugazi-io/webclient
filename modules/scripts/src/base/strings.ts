/// <reference path="../../../../scripts/bin/components/components.d.ts" />
/// <reference path="../../../../scripts/bin/components/modules.d.ts" />

/**
 * Created by nitzan on 24/04/2016.
 */

(function(): void {
	fugazi.components.modules.descriptor.loaded(<fugazi.components.modules.descriptor.Descriptor> {
		name: "io.fugazi.strings",
		constraints: [
			{
				name: "maxLength",
				title: "Maximum Length",
				types: ["string"],
				params: ["max"],
				validator: function(max: number): fugazi.components.types.constraints.BoundConstraintValidator {
					if (typeof max === "string") {
						max = parseFloat(max);
					}

					return function(value: string): boolean {
						return value.length <= max;
					}
				}
			},
			{
				name: "minLength",
				title: "Minimum Length",
				types: ["string"],
				params: ["min"],
				validator: function(min: number): fugazi.components.types.constraints.BoundConstraintValidator {
					if (typeof min === "string") {
						min = parseFloat(min);
					}

					return function(value: string): boolean {
						return value.length >= min;
					}
				}
			},
			{
				name: "exactLength",
				title: "Exact Length",
				types: ["string"],
				params: ["length"],
				validator: function(length: number | string): fugazi.components.types.constraints.BoundConstraintValidator {
					if (typeof length === "string") {
						length = parseFloat(length);
					}

					return function(value: string): boolean {
						return value.length === length;
					}
				}
			},
			{
				name: "between",
				title: "Length Between",
				types: ["string"],
				params: ["min", "max"],
				validator: function(min: number | string, max: number | string): fugazi.components.types.constraints.BoundConstraintValidator {
					if (typeof min === "string") {
						min = parseFloat(min);
					}
					if (typeof max === "string") {
						max = parseFloat(max);
					}

					return function(value: string): boolean {
						return value.length >= min && value.length <= max;
					}
				}
			},
			{
				name: "regex",
				title: "RegEx",
				types: ["string"],
				params: ["pattern", "flags"],
				validator: function(pattern: string, flags?: string): fugazi.components.types.constraints.BoundConstraintValidator {
					var regex = new RegExp(pattern, flags);

					return function(value: string): boolean {
						return regex.test(value);
					}
				}
			}
		]
	});
})();