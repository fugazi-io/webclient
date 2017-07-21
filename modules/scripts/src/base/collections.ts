import {Descriptor} from "../../../../scripts/src/components/modules.descriptor";
import {BoundConstraintValidator} from "../../../../scripts/src/components/constraints";
import {Map} from "../../../../scripts/src/core/types.collections";
/**
 * Created by nitzan on 24/04/2016.
 */

(function(): void {
	fugazi.components.modules.descriptor.loaded(<Descriptor> {
		name: "io.fugazi.collections",
		constraints: [
			{
				name: "maxSize",
				title: "Maximum Size",
				types: ["list", "map"],
				params: ["max"],
				validator: function(max: number): BoundConstraintValidator {
					return function(value: Array<any> | Map<any>): boolean {
						return (fugazi.is(value, Array) && (<Array<any>> value).length <= max)
							|| (fugazi.is(value, fugazi.collections.Map) && (<Map<any>> value).size() <= max);
					}
				}
			},
			{
				name: "minSize",
				title: "Minimum Size",
				types: ["list", "map"],
				params: ["min"],
				validator: function(min: number): BoundConstraintValidator {
					return function(value: Array<any> | Map<any>): boolean {
						return (fugazi.is(value, Array) && (<Array<any>> value).length >= min)
							|| (fugazi.is(value, fugazi.collections.Map) && (<Map<any>> value).size() >= min);
					}
				}
			},
			{
				name: "exactSize",
				title: "Exact Size",
				types: ["list", "map"],
				params: ["size"],
				validator: function(size: number): BoundConstraintValidator {
					return function(value: Array<any> | Map<any>): boolean {
						return (fugazi.is(value, Array) && (<Array<any>> value).length === size)
							|| (fugazi.is(value, fugazi.collections.Map) && (<Map<any>> value).size() === size);
					}
				}
			}
		]
	});
})();