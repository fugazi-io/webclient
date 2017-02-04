# Constraint Descriptor

## Interface
	interface ConstraintDescriptor extends ComponentDescriptor {
		types: Array<string>;
		validator: (...args: any[]) => (value: any) => boolean;
		params?: string[];
	}
	
## Properties
* types
	* `required`
	* `array` of `string`
	
	The names of the types which this constraint can validate.

* validator
	* `required`
	* `function`
	
	The function should expect the same number of parameters as defined in the `params` property (and in the same order).  
	The function needs to return a new function which expects a single param and returns a boolean indicating whether this value 
		validates.

* params
	* `optional`
	* `array` of `string`
	
	The list of the parameters this constraint needs in order to validate.
	
## Examples

#### Without parameters
	{
		name: "integer",
		title: "Integer",
		types: ["number"],
		validator: function() {
			return function (value: number): boolean {
				return Number.isInteger(value);
			}
		}
	}

#### With parameters
	{
		name: "between",
		title: "Value Between",
		types: ["number"],
		params: ["min", "max"],
		validator: function (min: number, max: number) {
			return function (value: number): boolean {
				return value >= min && value <= max;
			}
		}
	}