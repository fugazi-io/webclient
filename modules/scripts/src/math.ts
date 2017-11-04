import { Descriptor, FugaziMap, ModuleContext } from "../../../scripts/bin/app/modules.api";

(function(): void {
	const FIB_CACHE = [0, 1] as number[];
	function fib(index: number) {
		if (typeof FIB_CACHE[index] === "number") {
			return FIB_CACHE[index];
		}

		FIB_CACHE[index] = fib(index - 1) + fib(index - 2);
		return FIB_CACHE[index];
	}

	fugazi.loaded(<Descriptor> {
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
				handler: function(context: ModuleContext, params: FugaziMap<any>): number {
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
				handler: function(context: ModuleContext, params: FugaziMap<any>): number {
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
				handler: function(context: ModuleContext, params: FugaziMap<any>): number {
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
				handler: function(context: ModuleContext, params: FugaziMap<any>): number {
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
				handler: function(context: ModuleContext, a: number): number {
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
					"fib (num integer)"
				],
				handler: function(context: ModuleContext, num: number): number {
					return fib(num);
				}
			}
		}
	});
})();
