/// <reference path="../../../scripts/bin/components/components.d.ts" />
/// <reference path="../../../scripts/bin/components/modules.d.ts" />

/**
 * Created by nitzan on 19/04/2016.
 */

(function(): void {
	fugazi.components.modules.descriptor.loaded(<fugazi.components.modules.descriptor.Descriptor> {
		name: "samples.math",
		title: "Math Sample Module",
		types: {
			integer: {
				title: "Integer",
				type: "number[numbers.integer]"
			},
			float: {
				title: "Float",
				type: "number[numbers.float]"
			}
		},
		commands: {
			add: {
				title: "Addition",
				returns: "number",
				parametersForm: "map",
				syntax: [
					"(a number) + (b number)",
					"add (a number) (b number)",
					"add (numbers list<number>)"
				],
				handler: function(context: fugazi.app.modules.ModuleContext, params: fugazi.collections.Map<any>): number {
					if (params.has("a") && params.has("b")) {
						return params.get("a") + params.get("b");
					}

					if (params.has("numbers")) {
						return params.get("numbers").reduce((previousValue, currentValue) => previousValue + currentValue);
					}
				}
			},
			sub: {
				title: "Subtract",
				returns: "number",
				parametersForm: "map",
				syntax: [
					"(a number) - (b number)",
					"sub (a number) (b number)",
					"sub (numbers list<number>)"
				],
				handler: function(context: fugazi.app.modules.ModuleContext, params: fugazi.collections.Map<any>): number {
					if (params.has("a") && params.has("b")) {
						return params.get("a") - params.get("b");
					}

					if (params.has("numbers")) {
						return params.get("numbers").reduce((previousValue, currentValue) => previousValue - currentValue);
					}
				}
			},
			mul: {
				title: "Multiply",
				returns: "number",
				parametersForm: "map",
				syntax: [
					"(a number) * (b number)",
					"mul (a number) (b number)",
					"mul (numbers list<number>)"
				],
				handler: function(context: fugazi.app.modules.ModuleContext, params: fugazi.collections.Map<any>): number {
					if (params.has("a") && params.has("b")) {
						return params.get("a") * params.get("b");
					}

					if (params.has("numbers")) {
						return params.get("numbers").reduce((previousValue, currentValue) => previousValue * currentValue);
					}
				}
			},
			div: {
				title: "Divide",
				returns: "number",
				parametersForm: "map",
				syntax: [
					"(a number) / (b number)",
					"div (a number) (b number)",
					"div (numbers list<number>)"
				],
				handler: function(context: fugazi.app.modules.ModuleContext, params: fugazi.collections.Map<any>): number {
					if (params.has("a") && params.has("b")) {
						return params.get("a") / params.get("b");
					}

					if (params.has("numbers")) {
						return params.get("numbers").reduce((previousValue, currentValue) => previousValue / currentValue);
					}
				}
			},
			factorial: {
				title: "Factorial",
				returns: "number",
				parametersForm: "arguments",
				syntax: [
					"(a integer)!",
					"factorial of (a integer)"
				],
				handler: function(context: fugazi.app.modules.ModuleContext, a: number): number {
					let i = 1,
						result = 1;

					while (i++ < a) {
						result *= i;
					}

					return result;
				}
			},
			fib: {
				title: "Fibonacci",
				returns: "number",
				parametersForm: "arguments",
				syntax: [
					"fib (a integer)"
				],
				handler: function(context: fugazi.app.modules.ModuleContext, a: number): number {
					var result: number,
						cache: number[] = [],
						fn = index => {
							if (fugazi.is(cache[index], Number)) {
								return cache[index];
							}

							if (index == 0) {
								result = 0;
							} else if (index < 3) {
								result = 1;
							} else {
								result = fn(index - 1) + fn(index - 2);
							}

							cache[index] = result;
							return result;
						};

					return fn(a);
				}
			}
		}
	});
})();