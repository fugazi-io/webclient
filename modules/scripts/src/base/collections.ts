/// <reference path="../../../../scripts/bin/components/components.d.ts" />
/// <reference path="../../../../scripts/bin/components/modules.d.ts" />

/**
 * Created by nitzan on 24/04/2016.
 */

(function(): void {
	fugazi.components.modules.descriptor.loaded(<fugazi.components.modules.descriptor.Descriptor> {
		name: "io.fugazi.collections",
		constraints: [
			{
				name: "maxSize",
				title: "Maximum Size",
				types: ["list", "map"],
				params: ["max"],
				validator: function(max: number): fugazi.components.types.constraints.BoundConstraintValidator {
					return function(value: Array<any> | fugazi.collections.Map<any>): boolean {
						return (fugazi.is(value, Array) && (<Array<any>> value).length <= max)
							|| (fugazi.is(value, fugazi.collections.Map) && (<fugazi.collections.Map<any>> value).size() <= max);
					}
				}
			},
			{
				name: "minSize",
				title: "Minimum Size",
				types: ["list", "map"],
				params: ["min"],
				validator: function(min: number): fugazi.components.types.constraints.BoundConstraintValidator {
					return function(value: Array<any> | fugazi.collections.Map<any>): boolean {
						return (fugazi.is(value, Array) && (<Array<any>> value).length >= min)
							|| (fugazi.is(value, fugazi.collections.Map) && (<fugazi.collections.Map<any>> value).size() >= min);
					}
				}
			},
			{
				name: "exactSize",
				title: "Exact Size",
				types: ["list", "map"],
				params: ["size"],
				validator: function(size: number): fugazi.components.types.constraints.BoundConstraintValidator {
					return function(value: Array<any> | fugazi.collections.Map<any>): boolean {
						return (fugazi.is(value, Array) && (<Array<any>> value).length === size)
							|| (fugazi.is(value, fugazi.collections.Map) && (<fugazi.collections.Map<any>> value).size() === size);
					}
				}
			}
		]
	});
})();