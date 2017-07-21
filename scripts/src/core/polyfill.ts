import * as collections from "./types.collections";
import * as types from "./types";

/**
 * Fills in for missing implementation of needed functionality in built-in types
 */
declare global {
	interface ObjectConstructor {
		is<T>(obj: any, type: { new(): T }): obj is T;
		is(obj: any, type: any): boolean;
		isObject(obj: any): boolean;
		equals(obj1: any, obj2: any): boolean;
		merge(...sources: any[]): any;
		merge<T>(...sources: T[]): T;
		deepMerge(...sources: any[]): any;
		deepMerge<T>(...sources: T[]): T;
		partial<S extends T, T>(source: S, options: { include?: Array<keyof S>, exclude?: Array<keyof S> }): T;
	}
}
function equals(obj1: any, obj2: any): boolean {
	if (Number.isNaN(obj1) && Number.isNaN(obj2)) {
		return true;
	}

	if (typeof obj1.equals === "function") {
		return obj1.equals(obj2);
	}

	if (obj1.constructor !== obj2.constructor) {
		return false;
	}

	if (Object.isObject(obj1) && Object.isObject(obj2)) {
		return Object.keys(obj1).length === Object.keys(obj2).length
			&& Object.keys(obj1).every((key: any) => Object.equals(obj1[key], obj2[key]));
	}

	return obj1 == obj2;
}

Object.is = function <T>(obj: any, type: { new(): T }): obj is T {
	if (Number.isNaN(type as any) && Number.isNaN(obj)) {
		return true;
	}

	let objType: string = typeof obj;
	let nameRegex: RegExp = /Arguments|Function|String|Number|Date|Array|Boolean|RegExp/;

	if (obj && objType === "object") {
		return obj instanceof type;
	}

	let typeName: RegExpMatchArray = type.toString().match(nameRegex);
	if (typeName) {
		return typeName[0].toLowerCase() === objType;
	}

	return false;
}

Object.isObject = function (obj: any): boolean {
	return obj && obj.constructor === this || false;
};

Object.equals = function (obj1: any, obj2: any): boolean {
	return equals(obj1, obj2);
}

Object.merge = function <T>(...sources: T[]): T {
	return Object.assign({}, ...sources);
}

Object.deepMerge = function <T>(...sources: T[]): T {
	let merged = Object.assign({}, sources[0]) as any;

	for (let i = 1; i < sources.length; i++) {
		const source = sources[i] as any;

		Object.keys(sources[i]).forEach(name => {
			if (Object.isObject(merged[name]) && Object.isObject(source[name])) {
				merged[name] = Object.deepMerge(merged[name], source[name]);
			} else {
				merged[name] = source[name];
			}
		});
	}

	return merged;
}

Object.partial = function <S extends T, T>(source: S, options: { include?: Array<keyof S>, exclude?: Array<keyof S> }): T {
	const partial = {} as T;

	if (options.include) {
		options.include.forEach((name: keyof T) => {
			partial[name] = source[name];
		});
	} else if (options.exclude) {
		Object.keys(source).filter((name: keyof T) => options.exclude.indexOf(name) < 0).forEach((name: keyof T) => {
			partial[name] = source[name];
		});
	}

	return partial;
}

export interface URLUtils {
	hash: string;
	search: string;
	pathname: string;
	port: string;
	hostname: string;
	host: string;
	password: string;
	username: string;
	protocol: string;
	origin: string;
	href: string;
}

interface URL extends URLUtils {
	new(url: string, base?: string | URL): URL;
}

/**
 * string
 */
declare global {

	interface String {
		empty(): boolean;
		trimLeft(): string;
		trimRight(): string;
		startsWith(searchString: string, position?: number): boolean;
		endsWith(searchString: string, position?: number): boolean;
		has(substr: string): boolean;
		first(): string;
		last(): string;
		test(regex: RegExp): boolean;
		exec(regex: RegExp): RegExpExecArray;
		count(character: string): number;
		forEach(fn: (char: string, index?: number, str?: string) => void): void;
		some(fn: (char: string, index?: number, str?: string) => boolean): boolean;
		every(fn: (char: string, index?: number, str?: string) => boolean): boolean;
	}
}

String.prototype.empty = function (): boolean {
	return this.length == 0;
}

if (!String.prototype.trim) {
	String.prototype.trim = function (): string {
		return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
	};
}

if (!String.prototype.trimLeft) {
	String.prototype.trimLeft = function (): string {
		return this.replace(/^\s+/, "");
	};
}

if (!String.prototype.trimRight) {
	String.prototype.trimRight = function (): string {
		return this.replace(/\s+$/, "");
	};
}

if (!String.prototype.startsWith) {
	String.prototype.startsWith = function (searchString: string, position?: number): boolean {
		position = position || 0;
		return this.indexOf(searchString, position) === position;
	};
}

if (!String.prototype.endsWith) {
	String.prototype.endsWith = function (searchString: string, position?: number): boolean {
		position = position || this.length;
		return this.lastIndexOf(searchString, position) === position;
	};
}

String.prototype.has = function (substr: string): boolean {
	return this.indexOf(substr) >= 0;
}

String.prototype.test = function (regex: RegExp): boolean {
	return regex.test(this);
}

String.prototype.exec = function (regex: RegExp): RegExpExecArray {
	return regex.exec(this);
}

String.prototype.first = function (): string {
	return this.charAt(0);
}

String.prototype.last = function (): string {
	return this.charAt(this.length - 1);
}

String.prototype.count = function (character: string): number {
	var count = 0;

	for (var i: number = 0; i < this.length; i++) {
		if (this.charAt(i) === character) {
			count++;
		}
	}

	return count;
}

String.prototype.forEach = function (fn: (char: string, index?: number, str?: string) => void): void {
	for (let i = 0; i < this.length; i++) {
		fn(this.charAt(i), i, this);
	}
}

String.prototype.some = function (fn: (char: string, index?: number, str?: string) => boolean): boolean {
	for (let i = 0; i < this.length; i++) {
		if (fn(this.charAt(i), i, this)) {
			return true;
		}
	}

	return false;
}

String.prototype.every = function (fn: (char: string, index?: number, str?: string) => boolean): boolean {
	for (let i = 0; i < this.length; i++) {
		if (!fn(this.charAt(i), i, this)) {
			return false;
		}
	}

	return true;
}

/**
 * array
 */
declare global {

	interface ArrayConstructor {
		from(arrayLike: any, mapFn?: Function, thisArg?: any): Array<any>;
	}

	interface Array<T> {
		empty(): boolean;
		first(condition?: (item: T) => boolean): T;
		last(): T;
		clone(): Array<T>;
		equals(other: Array<T>): boolean;
		includes(item: T, fromIndex?: number): boolean;
		includesAll(items: T[]): boolean;
		includesAll(...items: T[]): boolean;
		remove(item: T | number): T;
		replace(item: number | T, other: T): T;
		extend(other: Array<T>): void;
		getIterator(): collections.ArrayIterator<any>;
	}
}

Array.prototype.empty = function (): boolean {
	return this.length == 0;
}

Array.prototype.first = function (condition?: (item: any) => boolean): any {
	if (!types.is(condition, Function)) {
		return this[0];
	}

	for (let i = 0; i < this.length; i++) {
		if (condition(this[i])) {
			return this[i];
		}
	}

	return null;
}

Array.prototype.last = function (): any {
	return this[this.length - 1];
}

Array.prototype.clone = function (): Array<any> {
	var cloned: Array<any> = [],
		iterator: (item: any) => void = function (item: any): void {
			this.push(item);
		}.bind(cloned);

	this.forEach(iterator);

	return cloned;
}

Array.prototype.getIterator = function (): collections.ArrayIterator<any> {
	return new collections.ArrayIterator<any>(this);
}

if (!Array.prototype.includes) {
	Array.prototype.includes = function (searchElement: any, fromIndex?: number) {
		"use strict";

		var O = Object(this);
		var len = parseInt(O.length) || 0;
		if (len === 0) {
			return false;
		}

		var n = parseInt(<any> fromIndex) || 0;
		var k;

		if (n >= 0) {
			k = n;
		} else {
			k = len + n;
			if (k < 0) {
				k = 0;
			}
		}

		var currentElement;
		while (k < len) {
			currentElement = O[k];
			if (searchElement === currentElement ||
				(searchElement !== searchElement && currentElement !== currentElement)) {
				return true;
			}
			k++;
		}

		return false;
	};
}

Array.prototype.includesAll = function (...items: any[]): boolean {
	return this.includesAll(items);
}

Array.prototype.includesAll = function (items: any[]): boolean {
	for (var i = 0; i < items.length; i++) {
		if (!this.includes(items[i])) {
			return false;
		}
	}

	return true;
}

Array.prototype.equals = function (other: Array<any>): boolean {
	if (this.length !== other.length) {
		return false;
	}

	return other.every(function (item: any): boolean {
		return this.includes(item);
	}.bind(this));
}

Array.prototype.remove = function (obj: any): any {
	if (typeof(obj) !== "number") {
		obj = this.indexOf(obj);
	}

	return this.splice(obj, 1)[0];
}

Array.prototype.replace = function (item: number | any, other: any): any {
	var index: number = types.is(item, Number) ? item : this.indexOf(item);
	item = this[index];
	this[index] = other;
	return item;
}

Array.prototype.extend = function (other: Array<any>): void {
	if (other) {
		Array.prototype.push.apply(this, other);
	}
}

/**
 * Map
 */

declare global {

	interface MapConstructor {
		from<V>(obj: { [key: string]: V } | Map<any, V>, deep?: boolean): Map<string, V>;
	}

	interface Map<K, V> {
		empty(): boolean;
		find(value: V): K;
		contains(value: V): boolean;
		clone(deep?: boolean): Map<K, V>;
		toObject(): { [key: string]: any };
		equals(other: Map<K, V>): boolean;
		merge(...maps: Array<Map<K, V> | { [key: string]: V }>): void;
		deepMerge(...maps: Array<Map<K, V> | { [key: string]: V }>): void;
		some(callback: (value: V, key: K, map: Map<K, V>) => boolean, thisArg?: any): boolean;
		every(callback: (value: V, key: K, map: Map<K, V>) => boolean, thisArg?: any): boolean;
		map<T>(callback: (value: V, key: K, map: Map<K, V>) => T, thisArg?: any): T[];
		map<K2, V2>(callback: (value: V, key: K, map: Map<K, V>) => [K2, V2], thisArg?: any): Map<K2, V2>;
	}

}

Map.from = function (obj: { [key: string]: any } | Map<any, any>, deep = false): Map<string, any> {
	if (Object.is(obj, Map)) {
		return obj;
	}

	if (!Object.isObject(obj)) {
		return new Map();
	}

	let data = [] as [string, any][];
	Object.keys(obj).forEach(key => {
		if (deep && Object.isObject(obj[key])) {
			data.push([key, Map.from(obj[key])]);
		} else {
			data.push([key, obj[key]]);
		}
	});

	return new Map(data);
}
Map.prototype.toString = function (): string {
	return JSON.stringify(this.toObject());
}

Map.prototype.clone = function (deep = false): Map<any, any> {
	return this.map((value: any, key: any) => {
		if (deep && value && typeof value.clone === "function") {
			return [key, value.clone()];
		} else {
			return [key, value];
		}
	});
}

Map.prototype.toObject = function (): { [key: string]: any } {
	const obj = {} as { [key: string]: any };

	this.forEach((value: any, key: string) => {
		obj[key.toString()] = value instanceof Map ? value.toObject() : value;
	});

	return obj;
}

Map.prototype.equals = function (other: Map<any, any>) {
	if (!other || !(other instanceof Map) || other.size !== this.size) {
		return false;
	}

	return this.every((value: any, key: any) => equals(value, other.get(key)));
}

Map.prototype.merge = function (...maps: Array<Map<any, any> | { [key: string]: any }>): void {
	for (let i = 0; i < maps.length; i++) {
		Map.from(maps[i]).forEach((value, key) => {
			this.set(key, value);
		});
	}
}

Map.prototype.deepMerge = function (...maps: Array<Map<any, any> | { [key: string]: any }>): void {
	for (let i = 0; i < maps.length; i++) {
		Map.from(maps[i]).forEach((value, key) => {
			if (Object.is(value, Map) && Object.is(this.get(key), Map)) {
				this.get(key).deepMerge(value);
			} else {
				this.set(key, value);
			}
		});
	}
}

if (!Map.prototype.empty) {
	Map.prototype.empty = function (): boolean {
		"use strict";

		return this.size === 0;
	};
}

if (!Map.prototype.find) {
	Map.prototype.find = function (value: any): any {
		for (let entry of this.entries()) {
			if (Object.equals(value, entry[1])) {
				return entry[0];
			}
		}

		return null;
	}
}

if (!Map.prototype.contains) {
	Map.prototype.contains = function (value: any): boolean {
		return this.find(value) !== null;
	}
}

if (!Map.prototype.some) {
	Map.prototype.some = function (callback: (value: any, key: any, map: Map<any, any>) => boolean, thisArg?: any): boolean {
		for (let entry of this.entries()) {
			if (callback.call(thisArg || this, entry[1], entry[0], this)) {
				return true;
			}
		}

		return false;
	}
}

if (!Map.prototype.every) {
	Map.prototype.every = function (callback: (value: any, key: any, map: Map<any, any>) => boolean, thisArg?: any): boolean {
		for (let entry of this.entries()) {
			if (!callback.call(thisArg || this, entry[1], entry[0], this)) {
				return false;
			}
		}

		return true;
	}
}

if (!Map.prototype.map) {
	Map.prototype.map = function (callback: (value: any, key: any, map: Map<any, any>) => any, thisArg?: any): any {
		let mappedArray: any[] = [];
		let mappedMap: Map<any, any> = new Map();

		for (let entry of this.entries()) {
			let mapped = callback.call(thisArg || this, entry[1], entry[0], this);

			if (mapped instanceof Array) {
				mappedMap.set(mapped[0], mapped[1]);
			} else {
				mappedArray.push(mapped);
			}
		}

		return !mappedArray.empty() ? mappedArray :
			(!mappedMap.empty() ? mappedMap : null);
	}
}