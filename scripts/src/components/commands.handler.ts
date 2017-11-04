import * as appModules from "../app/modules";

export enum ResultStatus {
	Success,
	Failure,
	Prompt
}

export interface Result {
	status: ResultStatus;
}

export function isResult(obj: any, status?: ResultStatus): obj is Result {
	return obj
		&& typeof obj.status === "number"
		&& typeof ResultStatus[obj.status] === "string"
		&& (status === undefined || obj.status === status);
}

export interface SuccessResult extends Result {
	value?: any;
}

export function isSuccessResult(obj: Result): obj is SuccessResult {
	return isResult(obj, ResultStatus.Success)
		&& (Object.keys(obj).length === 1 || (Object.keys(obj).length === 2 && (obj as SuccessResult).value));
}

export interface FailureResult extends Result {
	error: string;
}

export function isFailureResult(obj: Result): obj is FailureResult {
	return isResult(obj, ResultStatus.Failure) && typeof (obj as FailureResult).error === "string";
}

export interface PromptResult extends Result {
	message: "string";
	type: "string" | "password";
	handler: (value: string) => Result;
}

export function isPromptResult(obj: Result): obj is PromptResult {
	return isResult(obj, ResultStatus.Prompt)
		&& typeof (obj as PromptResult).message === "string"
		&& typeof (obj as PromptResult).handler === "function"
		&& ((obj as PromptResult).type === "string" || (obj as PromptResult).type === "password");
}

export enum PassedParametersForm {
	List,
	Arguments,
	Struct,
	Map
}

export interface Handler extends Function {}

export interface SyncedHandler extends Handler {
	(context: appModules.ModuleContext, ...params: any[]): Result | any;
}

export interface AsyncedHandler extends Handler {
	(context: appModules.ModuleContext, ...params: any[]): Promise<Result>;
}
