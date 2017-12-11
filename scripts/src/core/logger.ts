import { loadScript } from "./utils";
import * as constants from "../app/constants";
import * as applicationBus from "../app/application.bus";
//import * as bugsnag from "bugsnag-js";
import bugsnag from 'bugsnag-js';

const client = bugsnag("8dbc3432f95b3099a9faa79276686ebf");

export interface Logger {
	debug(...args: any[]): void;
	info(...args: any[]): void;
	warn(...args: any[]): void;
	error(...args: any[]): void;
}

export class Loggers {
	private loggers: Logger[] = [];

	add(logger: Logger) {
		this.loggers.push(logger);
	}

	debug(...args: any[]): void {
		this.loggers.forEach(l => { l.debug(...args); });
	}

	info(...args: any[]): void {
		this.loggers.forEach(l => { l.info(...args); });
	}

	warn(...args: any[]): void {
		this.loggers.forEach(l => { l.warn(...args); });
	}

	error(...args: any[]): void {
		this.loggers.forEach(l => { l.error(...args); });
	}
}

export class ConsoleLogger implements Logger {
	debug(...args: any[]): void {
		console.debug.apply(console, args);
	}
	info(...args: any[]): void {
		console.info.apply(console, args);
	}
	warn(...args: any[]): void {
		console.warn.apply(console, args);
	}
	error(...args: any[]): void {
		console.error.apply(console, args);
	}
}

declare global {
	interface Window {
		_LTracker: any[];
	}
}

export class LogglyLogger implements Logger {
	constructor() {
		window._LTracker = window._LTracker || [];
		window._LTracker.push({
			"logglyKey": "TOKEN",
			"sendConsoleErrors" : true,
			"tag" : "webclient"
		});
		loadScript("//cloudfront.loggly.com/js/loggly.tracker-latest.min.js");
	}

	debug(...args: any[]): void {
		const debugMessage = { 'data': args, 'level': 'debug' };
		window._LTracker.push(debugMessage);
	}

	info(...args: any[]): void {
		const infoMessage = { 'data': args, 'level': 'info' };
		window._LTracker.push(infoMessage);
	}

	warn(...args: any[]): void {
		const warnMessage = { 'data': args, 'level': 'warn' };
		window._LTracker.push(warnMessage);
	}

	error(...args: any[]): void {
		const errorMessage = { 'data': args, 'level': 'error' };
		window._LTracker.push(errorMessage);
	}
}

// init
export const loggers = new Loggers();
applicationBus.register(constants.Events.Loaded, function () {
	loggers.add(new LogglyLogger());
	loggers.add(new ConsoleLogger());

	console.log("Loggers loaded");

	loggers.debug("Debug test");
	loggers.info("Info test");
	loggers.warn("Warn test");
	loggers.error("Error test");
});

export function init() {}
