"use strict";

module fugazi.logger {
	export function debug(...args: any[]): void {
		console.debug.apply(console, args);
	}
	
	export function info(...args: any[]): void {
		console.info.apply(console, args);
	}
	
	export function warn(...args: any[]): void {
		console.warn.apply(console, args);
	}
	
	export function error(...args: any[]): void {
		console.error.apply(console, args);
	}
}
