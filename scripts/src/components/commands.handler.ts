import * as coreTypes from "../core/types";
import * as appModules from "../app/modules";

export function isHandlerResult(value: any): value is Result {
	return coreTypes.isPlainObject(value) && typeof ResultStatus[value.status] === "string";
}

export enum ResultStatus {
	Success,
	Failure,
	Prompt
}

export interface Result {
	status: ResultStatus;
	value?: any;
	error?: string;
}

export interface PromptData {
	type: "password";
	message: string;
	handlePromptValue: (value: string) => void;
}

export interface PromptResult extends Result {
	prompt: PromptData;
}

export function isPromptData(result: any): result is PromptData {
	return result && (result as PromptData).type === "password" && typeof (result as PromptData).message === "string";
}

export enum PassedParametersForm {
	List,
	Arguments,
	Struct,
	Map
}

export interface Handler extends Function {
}

export interface SyncedHandler extends Handler {
	(context: appModules.ModuleContext, ...params: any[]): Result | any;
}

export interface AsyncedHandler extends Handler {
	(context: appModules.ModuleContext, ...params: any[]): Promise<Result>;
}

