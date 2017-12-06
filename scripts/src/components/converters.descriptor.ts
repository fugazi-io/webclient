import * as componentsDescriptor from "./components.descriptor";

export interface Descriptor extends componentsDescriptor.Descriptor {
	input: string;
	output: string;
	converter: (input: any) => any;
}