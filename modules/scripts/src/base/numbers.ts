import {BoundConstraintValidator, Descriptor} from "../../../../scripts/bin/app/modules.api";


(function (): void {
	fugazi.loaded(<Descriptor> {
		name: "io.fugazi.numbers",
		constraints: [
			{
				name: "integer",
				title: "Integer",
				types: ["number"],
				params: [],
				validator: function (): BoundConstraintValidator {
					return function (value: number): boolean {
						return fugazi.isInteger(value);
					}
				}
			},
			{
				name: "float",
				title: "Float",
				types: ["number"],
				params: [],
				validator: function (): BoundConstraintValidator {
					return function (value: number): boolean {
						return fugazi.isFloat(value);
					}
				}
			},
			{
				name: "max",
				title: "function Value",
				types: ["number"],
				params: ["max"],
				validator: function (max: number | string): BoundConstraintValidator {
					if (typeof max === "string") {
						max = parseFloat(max);
					}

					return function (value: number): boolean {
						return value <= max;
					}
				}
			},
			{
				name: "min",
				title: "Minimum Value",
				types: ["number"],
				params: ["min"],
				validator: function (min: number | string): BoundConstraintValidator {
					if (typeof min === "string") {
						min = parseFloat(min);
					}

					return function (value: number): boolean {
						return value >= min;
					}
				}
			},
			{
				name: "between",
				title: "Between Values",
				types: ["number"],
				params: ["min", "max"],
				validator: function (min: number | string, max: number | string): BoundConstraintValidator {
					if (typeof min === "string") {
						min = parseFloat(min);
					}
					if (typeof max === "string") {
						max = parseFloat(max);
					}

					return function (value: number): boolean {
						return value >= min && value <= max;
					}
				}
			},
			{
				name: "positive",
				title: "Positive Value",
				types: ["number"],
				params: [],
				validator: function (): BoundConstraintValidator {
					return function (value: number): boolean {
						return value >= 0;
					}
				}
			},
			{
				name: "negative",
				title: "Negative Value",
				types: ["number"],
				params: [],
				validator: function (): BoundConstraintValidator {
					return function (value: number): boolean {
						return value < 0;
					}
				}
			},
			{
				name: "even",
				title: "Even Value",
				types: ["number"],
				params: [],
				validator: function (): BoundConstraintValidator {
					return function (value: number): boolean {
						return value % 2 === 0;
					}
				}
			},
			{
				name: "odd",
				title: "Odd Value",
				types: ["number"],
				params: [],
				validator: function (): BoundConstraintValidator {
					return function (value: number): boolean {
						return value % 2 === 1;
					}
				}
			},
			{
				name: "dividedBy",
				title: "Divided By Value",
				types: ["number"],
				params: ["divisor"],
				validator: function (divisor: number | string): BoundConstraintValidator {
					if (typeof divisor === "string") {
						divisor = parseFloat(divisor);
					}

					return function (value: number): boolean {
						return value % (divisor as number) === 0;
					}
				}
			}
		]
	});
})();