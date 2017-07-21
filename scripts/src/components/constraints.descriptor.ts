import * as componentsDescriptor from "./components.descriptor";
import * as constraints from "./constraints";

export interface Descriptor extends componentsDescriptor.Descriptor {
	types: string[];
	validator: constraints.UnboundConstraintValidator;
	params?: string[];
}
