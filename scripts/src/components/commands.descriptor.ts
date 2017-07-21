
import * as utils from "../core/utils";
import * as collections from "../core/types.collections";
import * as coreTypes from "../core/types";
import * as net from "../core/net";
import * as fugazi from "../core/types";
import * as components from "./components";
import * as componentsBuilder from "./components.builder";
import * as componentsDescriptor from "./components.descriptor";
import * as types from "./types";
import * as syntax from "./syntax";
import * as commands from "./commands";
import * as handler from "./commands.handler";
import * as descriptor from "./commands.descriptor";

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
