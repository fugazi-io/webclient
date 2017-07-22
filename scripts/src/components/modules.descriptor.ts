import * as utils from "../core/utils";
import * as collections from "../core/types.collections";
import * as coreTypes from "../core/types";
import * as net from "../core/net";
import * as logger from "../core/logger";
import * as dom from "../core/dom";
import * as constraintsDescriptor from "./constraints.descriptor";
import * as convertersDescriptor from "./converters.descriptor";
import * as componentsDescriptor from "./components.descriptor";
import * as commandsDescriptor from "./commands.descriptor";

import * as typesDescriptor from "./types.descriptor";
var loadingScriptModules: collections.Map<ScriptLoader> = collections.map<ScriptLoader>();

/**
 * Called by a loaded (script) component
 * @param descriptor
 */
export function loaded(moduleDescriptor: Descriptor): void {
	let currentScript = document.currentScript as HTMLScriptElement,
		name: string = currentScript.id;

	if (!loadingScriptModules.has(name)) {
		logger.error("unexpected module loaded");
		dom.remove(currentScript);
		return;
	}

	loadingScriptModules.remove(name).loadedCalled(moduleDescriptor);
}

export interface InnerComponentsCollection<T extends componentsDescriptor.Descriptor> {
}

export interface InnerComponentsArrayCollection<T extends componentsDescriptor.Descriptor> extends InnerComponentsCollection<T>, Array<string | T> {
}

export interface InnerComponentsObjectCollection<T extends componentsDescriptor.Descriptor> extends InnerComponentsCollection<T>, coreTypes.PlainObject<string | T> {
}

export interface InnerModulesCollection {
}

export interface InnerModulesArrayCollection extends InnerModulesCollection, Array<Descriptor | string> {
}

export interface InnerModulesObjectCollection extends InnerModulesCollection, coreTypes.PlainObject<Descriptor | string> {
}

export interface Descriptor extends componentsDescriptor.Descriptor {
	basePath?: string; // set when building
	remote?: RemoteDescriptor;
	lookup?: { [name: string]: string };
	modules?: InnerModulesCollection;
	types?: string | InnerComponentsCollection<typesDescriptor.Descriptor>;
	commands?: string | InnerComponentsCollection<commandsDescriptor.Descriptor>;
	converters?: string | InnerComponentsCollection<convertersDescriptor.Descriptor>;
	constraints?: string | InnerComponentsCollection<constraintsDescriptor.Descriptor>;
}

export type AuthenticationMethod = "none" | "basic" | "custom";

export interface BaseSourceRemoteDescriptor {
	base?: string;
	proxy?: string;
	default?: string;
	auth?: AuthenticationMethod;
}

export interface SingleSourceRemoteDescriptor extends BaseSourceRemoteDescriptor {
	origin: string;
}

export interface MultiSourceRemoteDescriptor extends BaseSourceRemoteDescriptor {
	origins: { [name: string]: string };
}

export type SourceRemoteDescriptor = SingleSourceRemoteDescriptor | MultiSourceRemoteDescriptor;

export function isSingleSourceRemoteDescriptor(remote: SourceRemoteDescriptor): remote is SingleSourceRemoteDescriptor {
	return (remote as SingleSourceRemoteDescriptor).origin != null;
}

export function isMultiSourceRemoteDescriptor(remote: SourceRemoteDescriptor): remote is MultiSourceRemoteDescriptor {
	return (remote as MultiSourceRemoteDescriptor).origins != null;
}

export interface RelativeRemoteDescriptor {
	path: string;
}

export type RemoteDescriptor = SourceRemoteDescriptor | RelativeRemoteDescriptor;

export function isRelativeRemoteDescriptor(remote: RemoteDescriptor): remote is RelativeRemoteDescriptor {
	return (remote as RelativeRemoteDescriptor).path != null;
}

export abstract class RemoteLoader extends componentsDescriptor.BaseLoader<Descriptor> {
	protected cached: boolean;
	protected future: coreTypes.Future<Descriptor>;

	constructor(url: net.Url, cached: boolean) {
		super(url);
		this.cached = cached;
		this.future = new coreTypes.Future<Descriptor>();
	}

	public then(fn: (aDescriptor: Descriptor) => Descriptor): componentsDescriptor.Loader<Descriptor> {
		this.future = this.future.then<Descriptor>(fn);
		return this;
	}

	public catch(fn: (error: coreTypes.Exception) => void): componentsDescriptor.Loader<Descriptor> {
		this.future = this.future.catch(fn);
		return this;
	}
}

export class HttpLoader extends RemoteLoader {
	constructor(url: net.Url, cached: boolean = true) {
		super(url, cached);

		url = url.clone();
		if (!cached) {
			url.addParam("dummy", new Date().getTime());
		}

		net.get({url: url, cors: true})
			.success(this.loaded.bind(this))
			.fail(this.failed.bind(this))
			.send();
	}

	private loaded(response: net.HttpResponse): void {
		try {
			this.future.resolve(response.getDataAsJson());
		} catch (e) {
			this.future.reject(new coreTypes.Exception("illegal module descriptor"));
		}
	}

	private failed(response: net.HttpResponse): void {
		this.future.reject(new coreTypes.Exception(response.getData()));
	}
}

export class ScriptLoader extends RemoteLoader {
	private static LOADED_TIMEOUT: number = 1000;

	private loaded: boolean;
	private scriptId: string;
	private timer: utils.Timer;

	constructor(url: net.Url, cached: boolean = true) {
		super(url, cached);

		this.loaded = false;
		this.scriptId = utils.generateId({prefix: "module_", min: 6, max: 10});
		loadingScriptModules.set(this.scriptId, this);
		utils.loadScript(this.baseUrl.toString(), this.scriptId, this.cached).then(
			this.scriptLoaded.bind(this),
			this.failed.bind(this, "component loading timeout"));
	}

	public loadedCalled(moduleDescriptor: Descriptor): void {
		this.loaded = true;
		this.timer && this.timer.cancel();
		this.future.resolve(moduleDescriptor);
	}

	private scriptLoaded(): void {
		if (!this.loaded) {
			this.timer = new utils.Timer(ScriptLoader.LOADED_TIMEOUT, this.failed.bind(this, "component did not call loaded"));
		}
	}

	private failed(message: string): void {
		this.timer && this.timer.cancel();
		this.future.reject(new coreTypes.Exception(message));
	}
}

