import * as componentsDescriptor from "./components.descriptor";
import * as types from "./types";
import * as handler from "./commands.handler";

export interface Descriptor extends componentsDescriptor.Descriptor {
	returns: types.Definition;
	convert?: {
		from: string;
		converter?: string;
	}
	syntax: string | string[];
	async?: boolean;
}

export interface LocalCommandDescriptor extends Descriptor {
	handler: handler.Handler;
	parametersForm?: "list" | "arguments" | "map" | "struct";
}

export interface RemoteHandlerDescriptor {
	endpoint: string;
	method?: string;
}

export interface RemoteCommandDescriptor extends Descriptor {
	handler: RemoteHandlerDescriptor;
}
