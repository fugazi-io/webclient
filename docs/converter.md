# Converter Descriptor

## Interface
	interface ConverterDescriptor extends ComponentDescriptor {
		input: string;
		output: string;
		converter: (input: inputType) => outputType;
	}
	
## Properties
* input
	* `optional`
	* `string`
	
	The name of the type for the input.  
	Can be either a path.

* output
	* `optional`
	* `string`
	
	The name of the type for the output.  
	Can be either a path.
	
* converter
	* `optional`
	* `function`
	
	A function that expects a single parameter of type `input` and needs to return 
		a value of type `output`.

## Examples
	{
		name: "string2number",
		title: "converts string to number",
		input: "string",
		output: "number",
		converter: function(input: string): number {
			return parseFloat(input);
		}
	}