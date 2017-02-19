/// <reference path="polyfill.ts" />

"use strict";

module fugazi {
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

	export function isEmpty(value: any): boolean {
		if (is(value, Array) || typeof(value) === "string") {
			return value.length === 0;
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
	
	export module collections {
		export interface ArrayLike<T> {
			length: number;
			[index: number]: T;
		}
	
		export interface KeyValueEntry<T> {
			key: string;
			value: T;
		}
	
		export interface Iterator<T> {
			hasNext(): boolean;
			next(): T;
		}
	
		export interface KeyValueIteratorCallback<T> extends Callback {
			(value: T, key: string): void;
		}
	
		export interface KeyValueBooleanIteratorCallback<T> extends Callback {
			(value: T, key: string): boolean;
		}
	
		export class PlainObjectIterator<T> implements Iterator<KeyValueEntry<T>> {
			private items: PlainObject<T>;
			private keys: string[];
			private index: number;
	
			constructor(obj: PlainObject<T>) {
				this.items = obj;
				this.keys = isPlainObject(obj) ? Object.keys(obj) : [];
				this.index = -1;
			}
	
			/**
			* @Override
			*/
			hasNext(): boolean {
				return this.index < this.keys.length  - 1;
			}
	
			/**
			* @Override
			*/
			next(): KeyValueEntry<T> {
				var key: string = this.keys[++this.index];
	
				return {
					key: key,
					value: this.items[key]
				}
			}
	
			nextKey(): string {
				return this.next().key;
			}
	
			nextValue(): T {
				return this.next().value;
			}
		}

		export function isEmpty(obj: PlainObject<any>): boolean {
			return !obj || Object.keys(obj).length === 0;
		}

		export function defaults(obj: PlainObject<any>, other: PlainObject<any>): void {
			var iterator: Iterator<KeyValueEntry<any>> = new PlainObjectIterator<any>(other),
				entry: KeyValueEntry<any>;

			while (iterator.hasNext()) {
				entry = iterator.next();
				if (isUndefined(obj[entry.key])) {
					obj[entry.key] = entry.value;
				}
			}
		}
	
		export function forEachKeyValue<T>(obj: PlainObject<T>, callback: KeyValueIteratorCallback<T>): void {
			var entry: KeyValueEntry<T>,
				iterator: PlainObjectIterator<T> = new PlainObjectIterator<T>(obj);
	
			while (iterator.hasNext()) {
				entry = iterator.next();
				callback(entry.value, entry.key);
			}
		}
	
		export function everyKeyValue<T>(obj: PlainObject<T>, callback: KeyValueBooleanIteratorCallback<T>): boolean {
			var entry: KeyValueEntry<T>,
				iterator: PlainObjectIterator<T> = new PlainObjectIterator<T>(obj);
	
			while (iterator.hasNext()) {
				entry = iterator.next();
				if (!callback(entry.value, entry.key)) {
					return false;
				}
			}
	
			return true;
		}
	
		export function someKeyValue<T>(obj: PlainObject<T>, callback: KeyValueBooleanIteratorCallback<T>): boolean {
			var entry: KeyValueEntry<T>,
				iterator: PlainObjectIterator<T> = new PlainObjectIterator<T>(obj);
	
			while (iterator.hasNext()) {
				entry = iterator.next();
				if (callback(entry.value, entry.key)) {
					return true;
				}
			}
	
			return false;
		}
	
		export function cloneArray<T>(array: ArrayLike<T>): Array<T> {
			var cloned: Array<T> = [];
	
			for (var i = 0; i < array.length; i++) {
				cloned[i] = array[i];
			}
	
			return cloned;
		}
	
		export class ArrayIterator<T> implements Iterator<T> {
			private items: Array<T>;
			private index: number;
	
			constructor(items: ArrayLike<T>) {
				this.items = cloneArray(items);
				this.index = -1;
			}
	
			/**
			* @Override
			*/
			hasNext(): boolean {
				return this.index < this.items.length  - 1;
			}
	
			/**
			* @Override
			*/
			next(): T {
				return this.items[++this.index];
			}
		}
	
		export interface Hashable {
			hash(): string;
		}
	
		export class Map<T> {
			private items: { [key: string]: T };
			private count: number;
	
			constructor() {
				this.count = 0;
				this.items = Object.create(null);
			}

			public keys(): string[] {
				return Object.keys(this.items);
			}

			public values(): T[] {
				return Object.keys(this.items).map<T>(function(key: string): T {
					return this.items[key];
				}.bind(this));
			}
	
			/**
			* @Override
			*/
			public has(key: string): boolean {
				for (var current in this.items) {
					if (key == current) {
						return true;
					}
				}
	
				return false;
			}

			public set(key: string, value: T): void {
				if (!this.has(key)) {
					this.count++;
				}
	
				this.items[key] = value;
			}

			public get(key: string): T {
				return this.items[key];
			}

			public remove(key: string): T {
				var value: T = this.get(key);
	
				if (this.has(key)) {
					this.count--;
				}
	
				delete this.items[key];
				return value;
			}

			public empty(): boolean {
				return this.size() === 0;
			}
	
			/**
			* @Override
			*/
			public size(): number {
				return this.count;
			}

			/**
			 * @Override
			 */
			public toString(): string {
				return JSON.stringify(this.items);
			}

			public asObject(): { [key: string]: T } {
				var obj: any = {};

				this.forEach(<KeyValueIteratorCallback<any>> function(value: any, key: string): void  {
					if (fugazi.is(value, collections.Map)) {
						obj[key] = (<collections.Map<any>> value).asObject();
					} else {
						obj[key] = this.get(key);
					}
				}.bind(this));

				return obj;
			}

			public forEach(callback: (value: T, key: string) => void): void;
			public forEach(callback: KeyValueIteratorCallback<T>): void {
				var itemsIterator : MapIterator<T> = this.getIterator();
	
				while (itemsIterator.hasNext()) {
					var item : KeyValueEntry<T> = itemsIterator.next();
					callback(item.value, item.key);
				}
			}

			public every(callback: KeyValueBooleanIteratorCallback<T>): boolean {
				var itemsIterator : MapIterator<T> = this.getIterator();
	
				while (itemsIterator.hasNext()) {
					var item : KeyValueEntry<T> = itemsIterator.next();
					if (!callback(item.value, item.key)) {
						return false;
					}
				}
	
				return true;
			}

			public some(callback: KeyValueBooleanIteratorCallback<T>): boolean {
				var itemsIterator : MapIterator<T> = this.getIterator();
	
				while (itemsIterator.hasNext()) {
					var item : KeyValueEntry<T> = itemsIterator.next();
					if (callback(item.value, item.key)) {
						return true;
					}
				}
	
				return false;
			}

			/**
			 * Shallow copy of this map
			 * @returns {Map<t>}
			 */
			public clone(): Map<T> {
				var cloned: Map<T> = new Map<T>();

				Object.keys(this.items).forEach(name => cloned.set(name, this.get(name)));

				return cloned;
			}

			public getIterator(): MapIterator<T> {
				return new MapIterator<T>(this.items);
			}

			public extend(obj: PlainObject<T>): void;
			public extend(map: Map<T>): void;
			public extend(obj: any): void {
				var iterator: Iterator<KeyValueEntry<T>>,
					entry: KeyValueEntry<T>;
	
				if (isPlainObject(obj)) {
					iterator = new PlainObjectIterator<T>(obj);
				} else {
					iterator = obj.getIterator();
				}
	
				while (iterator.hasNext()) {
					entry = iterator.next();
					this.set(entry.key, entry.value);
				}
			}

			public defaults(obj: PlainObject<T>): void;
			public defaults(map: Map<T>): void;
			public defaults(obj: any): void {
				var iterator: Iterator<KeyValueEntry<T>>,
						entry: KeyValueEntry<T>;

				if (isPlainObject(obj)) {
					iterator = new PlainObjectIterator<T>(obj);
				} else {
					iterator = obj.getIterator();
				}

				while (iterator.hasNext()) {
					entry = iterator.next();
					if (!this.has(entry.key)) {
						this.set(entry.key, entry.value);
					}
				}
			}
		}
	
		export class MapEntry<K extends Hashable, V> {
			public key: K;
			public value: V;
	
			constructor(key: K, value: V) {
				this.key = key;
				this.value = value;
			}
		}
	
		export class EntryMap<K extends Hashable, V> extends Map<MapEntry<K, V>> {
			hasEntry(key: K): boolean {
				return this.has(key.hash());
			}
	
			setEntry(key: K, value: V): void {
				this.set(key.hash(), new MapEntry(key, value));
			}
	
			getEntry(key: K): V {
				return this.get(key.hash()).value;
			}
	
			removeEntry(key: K): V {
				return this.remove(key.hash()).value;
			}
		}
	
		export class MapIterator<T> implements Iterator<KeyValueEntry<T>> {
			private values: T[];
			private keys: string[];
			private index: number;
	
			constructor(items: { [key: string]: T }) {
				this.index = 0;
				this.keys = Object.keys(items);
				this.values = [];
	
				for (var i = 0; i < this.keys.length; i++) {
					this.values.push(items[this.keys[i]]);
				}
			}
	
			/**
			* @Override
			*/
			hasNext(): boolean {
				return this.index < this.keys.length;
			}
	
			/**
			* @Override
			*/
			next(): KeyValueEntry<T> {
				return {
					key: this.keys[this.index],
					value: this.values[this.index++]
				}
			}
	
			nextKey(): string {
				return this.next().key;
			}
	
			nextValue(): T {
				return this.next().value;
			}
		}
	
		export function map<T>(obj?: PlainObject<any> | Map<T>, recursive?: boolean): Map<T> {
			let result: Map<T> = new Map<T>();

			if (fugazi.isNothing(obj)) {
				return result;
			}

			if (fugazi.isNothing(recursive)) {
				recursive = false;
			}

			(obj instanceof Map ? obj.keys() : Object.keys(obj)).forEach(key => {
				let value: T = obj instanceof Map ? obj.get(key) : obj[key];

				if (recursive && (fugazi.isPlainObject(value) || fugazi.is(value, Map))) {
					result.set(key, <any> map(value, true));
				} else {
					result.set(key, value);
				}
			});

			return result;
		}

		export class Stack<T> {
			private items: T[];

			public constructor() {
				this.items = [];
			}

			public size(): number {
				return this.items.length;
			}

			public push(item: T): void {
				this.items.unshift(item);
			}

			public peek(): T {
				if (this.size() === 0) {
					return undefined;
				}

				return this.items[0];
			}

			public pop(): T {
				if (this.size() === 0) {
					return undefined;
				}

				return this.items.remove(0);
			}
		}

		export function stack<T>(): Stack<T> {
			return new Stack<T>();
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
			return this.then(fn, function(e: any): void { fn(e); throw e; });
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
}