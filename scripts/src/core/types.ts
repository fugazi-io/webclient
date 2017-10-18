export interface PlainObject<T> {
	[key: string]: T;
}

export interface Callback {
	(): void;
}

export function is(obj: any, type: NumberConstructor): obj is number;
export function is(obj: any, type: StringConstructor): obj is string;
export function is<T>(obj: any, type: { prototype: T }): obj is T;
export function is(obj: any, type: any): boolean {
	const objType: string = typeof obj;
	const typeString = type.toString();
	const nameRegex: RegExp = /Arguments|Function|String|Number|Date|Array|Boolean|RegExp/;

	let typeName: string;

	if (obj && objType === "object") {
		return obj instanceof type;
	}

	if (typeString.startsWith("class ")) {
		return type.name.toLowerCase() === objType;
	}

	typeName = typeString.match(nameRegex);
	if (typeName) {
		return typeName[0].toLowerCase() === objType;
	}

	return false;
}

export function isNull(value: any): boolean {
	return value === null;
}

export function isUndefined(value: any): boolean {
	return value === undefined;
}

export function isNothing(value: any): boolean {
	return isUndefined(value) || isNull(value);
}

export function isInteger(num: any): boolean {
	return is(num, Number) && num % 1 === 0;
}

export function isFloat(num: any): boolean {
	return is(num, Number) && !isInteger(num);
}

export function isPlainObject(value: any): boolean {
	return !isNothing(value) && typeof value === "object" && (value.constructor == null || value.constructor === Object);
	//return value && Object.prototype.toString.call(value) === "[object Object]";
}

export declare class Error {
	public name: string;
	public message: string;
	public stack: string;
	public linenumber: number;

	constructor(message?: string);
}

export class Exception extends Error {
	constructor(message: string);
	constructor(message: string, name: string);

	constructor() {
		super(arguments[0]);

		this.name = arguments[1] || "Exception";
		this.message = arguments[0];
		this.stack = (<any> new Error(arguments[0])).stack;
	}

	toString(): string {
		return this.name + ": " + this.message + "at " + this.linenumber;
	}
}

export class Future<T> implements PromiseLike<T> {
	private parent: Future<any>;
	private promise: Promise<T>;
	private resolveFunction: (value?: T | PromiseLike<T>) => void;
	private rejectFunction: (reason?: any) => void;

	constructor();
	constructor(parent: Future<any>, promise: Promise<any>);
	constructor(parent?: Future<any>, promise?: Promise<any>) {
		if (parent) {
			this.parent = parent;
			this.promise = promise;
		} else {
			this.promise = new Promise(this.promiseExecutor.bind(this));
		}
	}

	public asPromise(): Promise<T> {
		return this.promise;
	}

	public then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Future<TResult>;
	public then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: any) => void): Future<TResult>;
	public then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: any) => any): Future<TResult> {
		return new Future(this, this.promise.then(onfulfilled));
	}

	public catch(onrejected?: (reason: any) => T | PromiseLike<T>): Future<T>;
	public catch(onrejected?: (reason: any) => void): Future<T>;
	public catch(onrejected?: (reason: any) => any): Future<T> {
		return new Future(this, this.promise.catch(onrejected));
	}

	finally<TResult>(fn: (value: any) => TResult | PromiseLike<TResult>): Future<TResult> {
		return this.then(fn, function (e: any): void {
			fn(e);
			throw e;
		});
	}

	public resolve(value?: T | PromiseLike<T>) {
		if (this.parent) {
			this.parent.resolve(value);
		} else {
			this.resolveFunction(value);
		}
	}

	public reject(reason?: any) {
		if (this.parent) {
			this.parent.reject(reason);
		} else {
			this.rejectFunction(reason);
		}
	}

	private promiseExecutor(resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) {
		this.resolveFunction = resolve;
		this.rejectFunction = reject;
	}
}