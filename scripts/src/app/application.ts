import * as utils from "../core/utils";
import * as registry from "../components/registry";
import * as converters from "../components/converters";
import * as types from "../components/types";

let context: ApplicationContext;
export function getContext() {
	return context;
}
export function setContext(newContext: ApplicationContext) {
	context = newContext;
}

export const CONTEXT_ID_PARAMS: utils.GenerateIdParameters = {
	min: 5,
	max: 10,
	prefix: "context:"
};

export type Variable = {
	name: string,
	type: types.Type,
	value: any
}

export interface UIServiceProvider {
	promptFor(message: string, input?: "text" | "password", type?: types.Type): Promise<string>;
	promptFor<T>(message: string, input?: "text" | "password", type?: types.Type): Promise<T>;

	promptFor(message: string, input: "boolean", labels?: [string, string]): Promise<boolean>;

	promptFor(message: string, input: "select", items: string[]): Promise<number>;
	promptFor<T extends number|string>(message: string, input: "select", items: Map<T, string>): Promise<T>;
}

export interface Context {
	getId(): string;

	guessType(value: any): types.Type;
	guessTypeFromString(value: string): types.Type;

	getConverter(from: types.Type, to: types.Type): converters.Converter;
}

export abstract class BaseContext<T extends Context> implements Context {
	private id: string;
	private parent: T;

	constructor(parent?: T, id?: string) {
		this.parent = parent || null;
		this.id = id || utils.generateId(CONTEXT_ID_PARAMS);
	}

	public getId(): string {
		return this.id;
	}

	public getParent(): T {
		return this.parent;
	}

	public guessType(value: any): types.Type {
		return registry.guessType(value);
	}

	public guessTypeFromString(value: string): types.Type {
		return registry.guessTypeFromString(value);
	}

	public getConverter(from: types.Type, to: types.Type): converters.Converter {
		return registry.getConverter(from, to);
	}
}

export class ApplicationContext extends BaseContext<null> {}
