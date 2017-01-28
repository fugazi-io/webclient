"use strict";

module fugazi.location {
	var LOCATION: Location = document.location;
	var BASE_URL: string = "//" + host() + path().substring(0, path().indexOf("/", 1));

	export function origin(): string {
		return LOCATION.origin;
	}

	export function protocol(): string {
		return LOCATION.protocol.replace(/\:/g, "");
	}

	export function host(): string {
		return LOCATION.host;
	}

	export function hostname(): string {
		return LOCATION.hostname;
	}

	export function port(): number {
		return parseInt(LOCATION.port);
	}

	export function path(): string {
		return LOCATION.pathname;
	}

	export function relative(path: string): string {
		return BASE_URL + "/" + path;
	}
}