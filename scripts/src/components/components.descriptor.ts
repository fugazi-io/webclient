import * as coreTypes from "../core/types";
import * as net from "../core/net";
import * as location from "../app/application.location";
import * as components from "./components";

export interface Descriptor {
	name: string;
	title?: string;
	description?: string;
	manual?: components.Manual;
	componentConstructor?: { new (): components.Component };
}

export interface Loader<T extends Descriptor> {
	then(fn: (aDescriptor: T) => any): Loader<T>;
	catch(fn: (error: coreTypes.Exception) => void): Loader<T>;
	getUrl(): net.Url;
	getUrlFor(path: string): net.Url;
}

export abstract class BaseLoader<T extends Descriptor> implements Loader<T> {
	protected baseUrl: net.Url;

	constructor(baseUrl?: net.Url) {
		this.baseUrl = baseUrl || location.currentScript();
	}

	public getUrl(): net.Url {
		return this.baseUrl == null ? null : this.baseUrl.clone();
	}

	public getUrlFor(path: string): net.Url {
		return this.baseUrl == null ? null : new net.Url(path, this.baseUrl);
	}

	public abstract then(fn: (aDescriptor: T) => any): Loader<T>;

	public abstract catch(fn: (error: coreTypes.Exception) => void): Loader<T>;
}

export class ExistingLoader<T extends Descriptor> extends BaseLoader<T> {
	private aDescriptor: T;

	constructor(aDescriptor: T, baseUrl?: net.Url) {
		super(baseUrl);
		this.aDescriptor = aDescriptor;
	}

	then(fn: (aDescriptor: T) => void | T): Loader<T> {
		let result = fn(this.aDescriptor);

		if (coreTypes.isPlainObject(result) && coreTypes.is((<T> result).name, String)) {
			this.aDescriptor = <T> result;
		}

		return this;
	}

	catch(fn: (error: coreTypes.Exception) => void): Loader<T> {
		return this;
	}
}

export class FailedLoader extends BaseLoader<Descriptor> {
	private error: coreTypes.Exception;

	constructor(error: coreTypes.Exception, baseUrl?: net.Url) {
		super(baseUrl);
		this.error = error;
	}

	then(fn: (aDescriptor: Descriptor) => void): Loader<Descriptor> {
		return this;
	}

	catch(fn: (error: coreTypes.Exception) => void): Loader<Descriptor> {
		fn(this.error);
		return this;
	}
}

