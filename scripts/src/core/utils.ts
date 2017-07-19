/// <reference path="dom.ts" />
/// <reference path="logger.ts" />

"use strict";

module fugazi.utils {
	export function defaults(obj: Object, other: Object): void {
		for (var key in other) {
			if (other.hasOwnProperty(key) && !obj[key]) {
				obj[key] = other[key];
			}
		}
	}
	
	export function random(min: number, max: number, integer: boolean = true) {
		var num: number = Math.random() * (max - min + 1) + min;
		return integer ? Math.floor(num) : num;
	}

	export function applyMixins(derivedCtor: any, baseCtors: any[]) {
		baseCtors.forEach(baseCtor => {
			Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
				derivedCtor.prototype[name] = baseCtor.prototype[name];
			});
		});
	}
	
	export interface GenerateIdParameters {
		min?: number;
		max?: number;
		length?: number;
		prefix?: string;
	}
	
	var generateIdParametersDefaults: GenerateIdParameters = {
		min: 6,
		max: 10
	};
	
	var generateIdCharacters: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	
	export function generateId(params?: GenerateIdParameters): string {
		var name: string,
			length: number;
	
		params = params || {};
		name = params.prefix || ""
	
		defaults(params, generateIdParametersDefaults);
		length = params.length || random(params.min, params.max);
	
		for (var i = 0; i < length; i++) {
			name += generateIdCharacters.charAt(random(0, generateIdCharacters.length));
		}
	
		return name;
	}
	
	export class Timer {
		private name: number;
		private interval: number;
		private callback: Callback;
	
		constructor(interval: number, callback: Callback) {
			this.interval = interval;
			this.callback = callback;
	
			this.reset();
		}
	
		reset(): void {
			this.cancel();
			this.name = setTimeout(this.callback, this.interval) as any as number;
		}
	
		cancel(): void {
			clearTimeout(this.name);
		}
	}
	
	export function loadScript(url: string);
	export function loadScript(url: string, name: string);
	export function loadScript(url: string, cached: boolean);
	export function loadScript(url: string, name: string, cached: boolean);
	export function loadScript(...args: any[]): Promise<HTMLScriptElement> {
		var url: string = args[0];
		var name: string = fugazi.is(args[1], String) ? args[1] : utils.generateId({ prefix: "script:", min: 6, max: 10 });
		var cached: boolean = fugazi.is(args[1], Boolean) ? args[1] : (fugazi.is(args[2], Boolean) ? args[2] : true); 
		return new ScriptLoader(url, name, cached).load();
	}
	
	class ScriptLoader {
		private static SCRIPT_TIMEOUT = 5000;
	
		private id: string;
		private cached: boolean;
		private timer: utils.Timer;
		private url: string;
		private scriptElement: HTMLScriptElement;
		private future: fugazi.Future<HTMLScriptElement>;
		
		public constructor(url: string, id: string, cached: boolean) {
			this.id = id;
			this.url = url;
			this.cached = cached;
			this.future = new fugazi.Future<HTMLScriptElement>();
		}
		
		public load(): Promise<HTMLScriptElement> {
			var src: string = this.url + (this.cached ? "?dummy=" + new Date().getTime() : "");
			this.scriptElement = <HTMLScriptElement> dom.create("script", {
				src: src,
				id: this.id
			});
	
			this.scriptElement.addEventListener("load", this.loaded.bind(this));
			this.timer = new Timer(ScriptLoader.SCRIPT_TIMEOUT, this.timedout.bind(this));
			dom.insert(this.scriptElement, dom.lastChild(document.head, "script"));
			return this.future.asPromise();
		}
		
		private loaded(): void {
			this.timer.cancel();
			this.future.resolve(this.scriptElement);
		}
		
		private timedout(): void {
			this.future.reject(new fugazi.Exception("loading of script " + this.id + " timed out"));
		}
	}
}
