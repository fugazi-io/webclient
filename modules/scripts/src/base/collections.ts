import {BoundConstraintValidator, Descriptor, FugaziMap} from "../../../../scripts/bin/app/modules.api";

(function (): void {
	fugazi.loaded(<Descriptor> {
		name: "io.fugazi.collections",
		constraints: [
			{
				name: "maxSize",
				title: "Maximum Size",
				types: ["list", "map"],
				params: ["max"],
				validator: function (max: number): BoundConstraintValidator {
					return function (value: Array<any> | FugaziMap<any>): boolean {
						return (fugazi.is(value, Array) && (<Array<any>> value).length <= max)
							|| (fugazi.is(value, fugazi.collections.FugaziMap) && (<FugaziMap<any>> value).size() <= max);
					}
				}
			},
			{
				name: "minSize",
				title: "Minimum Size",
				types: ["list", "map"],
				params: ["min"],
				validator: function (min: number): BoundConstraintValidator {
					return function (value: Array<any> | FugaziMap<any>): boolean {
						return (fugazi.is(value, Array) && (<Array<any>> value).length >= min)
							|| (fugazi.is(value, fugazi.collections.FugaziMap) && (<FugaziMap<any>> value).size() >= min);
					}
				}
			},
			{
				name: "exactSize",
				title: "Exact Size",
				types: ["list", "map"],
				params: ["size"],
				validator: function (size: number): BoundConstraintValidator {
					return function (value: Array<any> | FugaziMap<any>): boolean {
						return (fugazi.is(value, Array) && (<Array<any>> value).length === size)
							|| (fugazi.is(value, fugazi.collections.FugaziMap) && (<FugaziMap<any>> value).size() === size);
					}
				}
			}
		]
	});
})();
