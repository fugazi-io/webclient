import * as componentsDescriptor from "./components.descriptor";
import * as types from "./types";

export interface Descriptor extends componentsDescriptor.Descriptor {
	type: types.Definition;
}

export interface StructDescriptor extends Descriptor {
	base: string;
}

export function isAnonymousDefinition(definition: types.TextualDefinition): boolean {
	return definition.indexOf("<") > 0 || definition.indexOf("[") > 0;
}
