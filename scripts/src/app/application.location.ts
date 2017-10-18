import * as net from "../core/net";
import * as dom from "../core/dom";
import * as coreTypes from "../core/types";

let baseUrl: net.Url;

export function current(): net.Url {
	return new net.Url(window.location.href);
}

export function base(): net.Url {
	return baseUrl;
}

export function currentScript(): net.Url {
	return document.currentScript ? new net.Url((document.currentScript as HTMLScriptElement).src) : null;
}

export function scripts(scriptPath?: string): net.Url {
	let url = new net.Url("./scripts/bin/", baseUrl);

	if (scriptPath) {
		url = new net.Url(scriptPath, url);
	}

	return url;
}

export function modules(modulePath: string): net.Url;
export function modules(type: "js" | "json", modulePath?: string): net.Url;
export function modules() {
	let url: net.Url,
		base: string,
		modulePath: string,
		args = Array.from(arguments);

	if (args[0].endsWith("js")) {
		base = "./modules/scripts/bin/";
	} else if (args[0].endsWith("json")) {
		base = "./modules/jsons/";
	} else {
		throw new coreTypes.Exception("module can only be js or json");
	}

	if (args.length === 2) {
		modulePath = args[1];
	} else if (args[0] !== "js" && args[0] !== "json") {
		modulePath = args[0];
	}

	url = new net.Url(base, baseUrl);

	if (modulePath) {
		url = new net.Url(modulePath, url);
	}

	return url;
}

dom.ready(() => {
	baseUrl = current();
});

