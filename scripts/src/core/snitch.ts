import { loadScript } from "./utils";
import * as constants from "../app/constants";
import * as applicationBus from "../app/application.bus";

import bugsnag from 'bugsnag-js';
import * as ReactGA from 'react-ga';

const client = bugsnag("T O K E N");


export interface Metric {
	timestamp?: Date,
	key: string,
	value: number
}

export interface Event {
	timestamp?: Date,
	type: string,
	data: any
}

export interface Snitcher {
	debug(...args: any[]): void;
	info(...args: any[]): void;
	warn(...args: any[]): void;
	error(...args: any[]): void;
	trace(metric: Metric): void;
	notify(event: Event): void;
}

class Snitchers implements Snitcher {
	private instances: Snitcher[] = [];

	add(snitch: Snitcher) {
		this.instances.push(snitch);
	}

	debug(...args: any[]): void {
		this.instances.forEach(l => {
			l.debug(...args);
		});
	}

	info(...args: any[]): void {
		this.instances.forEach(l => {
			l.info(...args);
		});
	}

	warn(...args: any[]): void {
		this.instances.forEach(l => {
			l.warn(...args);
		});
	}

	error(...args: any[]): void {
		this.instances.forEach(l => {
			l.error(...args);
		});
	}

	trace(metric: Metric): void {
		this.instances.forEach(l => {
			l.trace(metric);
		});
	}

	notify(event: Event): void {
		this.instances.forEach(l => {
			l.notify(event);
		});
	}

}

class ConsoleSnitcher implements Snitcher {
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

	trace(metric: Metric): void {
		console.info(`Metric ${metric.key}: ${metric.value} recorded at ${metric.timestamp}`);
	}

	notify(event: Event): void {
		console.info(`Event ${event.type}: ${event.data} recorded at ${event.timestamp}`);
	}
}

declare global { interface Window { _LTracker: any[]; } }
class LogglySnitcher implements Snitcher {
	constructor() {
		window._LTracker = window._LTracker || [];
		window._LTracker.push({
			"logglyKey": "T O K E N",
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

	trace(metric: Metric): void {
		// unsupported
	}

	notify(event: Event): void {
		// unsupported
	}
}

class GoogleAnalyticsSnitcher implements Snitcher {
	constructor() {
		ReactGA.initialize('UA-91051756-1');
		ReactGA.pageview(window.location.pathname + window.location.search);
	}

	debug(...args: any[]): void {
		// unsupported
	}

	info(...args: any[]): void {
		// unsupported
	}

	warn(...args: any[]): void {
		// unsupported
	}

	error(...args: any[]): void {
		// unsupported
	}

	trace(metric: Metric): void {
		// unsupported
	}

	notify(event: Event): void {
		ReactGA.event({
			category: event.type,
			action: event.data.toString()
		});
	}
}


export const snitchers: Snitcher = new Snitchers();
applicationBus.register(constants.Events.Loaded, function () {
	(snitchers as Snitchers).add(new LogglySnitcher());
	(snitchers as Snitchers).add(new ConsoleSnitcher());
	(snitchers as Snitchers).add(new GoogleAnalyticsSnitcher());

	console.log("Loggers loaded");

	snitchers.debug("Debug test");
	snitchers.info("Info test");
	snitchers.warn("Warn test");
	snitchers.error("Error test");
});

export function init() {}
