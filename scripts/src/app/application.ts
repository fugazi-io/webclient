/// <reference path="../../lib/react.d.ts" />

/// <reference path="./storage.ts" />
/// <reference path="../core/configuration.ts" />
/// <reference path="../core/dom.ts" />
/// <reference path="../components/types.ts" />
/// <reference path="../components/registry.ts" />
/// <reference path="../view/main.tsx" />

"use strict";

module fugazi.app {
	export const version = {
		code: "1.0.1",
		name: "The Argument",
		toString: function() {
			return `${ this.name } (${ this.code })`;
		}
	};

	export const Events = {
		Loaded: "app.loaded",
		Ready: "app.ready"
	};

	var context: ApplicationContext,
		mainView: view.MainView,
		CONTEXT_ID_PARAMS: utils.GenerateIdParameters = {
			min: 5,
			max: 10,
			prefix: "context:"
		};

	export type Variable = {
		name: string,
		type: components.types.Type,
		value: any
	}

	export interface Context {
		getId(): string;

		guessType(value: any): components.types.Type;
		guessTypeFromString(value: string): components.types.Type;

		getConverter(from: components.types.Type, to: components.types.Type): components.converters.Converter;
	}

	export abstract class BaseContext<T extends Context> implements Context {
		private id: string;
		private parent: T;

		constructor(parent?: T, id?: string) {
			this.parent = parent || null;
			this.id = id || utils.generateId(CONTEXT_ID_PARAMS);
		}

		public getId(): string {
			return this.id;
		}

		public getParent(): T {
			return this.parent;
		}

		public guessType(value: any): components.types.Type {
			return components.registry.guessType(value);
		}

		public guessTypeFromString(value: string): components.types.Type {
			return components.registry.guessTypeFromString(value);
		}

		public getConverter(from: components.types.Type, to: components.types.Type): components.converters.Converter {
			return components.registry.getConverter(from, to);
		}
	}

	export class ApplicationContext extends BaseContext<null> {}

	function kickstart(): void {
		context = new ApplicationContext();

		fugazi.app.storage.initialize({useCompression: false});

		bus.register(components.registry.Events.Ready, () => {
			fugazi.components.registry.load({ augment: true, url: location.modules("base.json") }).then(() => {
				bus.post(Events.Ready);
				showView();
			});
		});

		bus.post(Events.Loaded);
	}

	function showView() {
		let name: string = "terminal", //utils.generateId({ prefix: "terminal", min: 5, max: 10 }),
			terminal: view.TerminalView ;

		let properties: terminal.Properties = storage.local.fetch<terminal.Properties>(name);
		if (properties == null) {
			properties = {
				name: name,
				title: "le terminal",
				history: []
			}
		}

		mainView = fugazi.view.render(<HTMLElement> fugazi.dom.get("main#ui"));

		terminals.create(properties, mainView);
	}

	namespace terminals {
		const items: terminal.Terminal[] = [];

		export function create(properties: terminal.Properties, viewFactory: view.TerminalFactory): app.terminal.Terminal {
			var terminal: app.terminal.Terminal = new app.terminal.Terminal(properties, context, viewFactory);
			items.push(terminal);
			return terminal;
		}
	}

	export namespace bus {
		const subscribers: collections.Map<EventHandler[]> = collections.map<EventHandler[]>();

		export interface EventHandler {
			(): void;
		}

		export function register(eventName: string, eventHandler: EventHandler): void {
			var handlers: EventHandler[];

			if (subscribers.has(eventName)) {
				handlers = subscribers.get(eventName);
			} else {
				handlers = [];
				subscribers.set(eventName, handlers);
			}

			handlers.push(eventHandler);
		}

		export function unregister(eventName: string, eventHandler: EventHandler): void {
			if (subscribers.has(eventName)) {
				subscribers.get(eventName).remove(eventHandler);
			}
		}

		export function post(eventName: string) {
			if (subscribers.has(eventName)) {
				subscribers.get(eventName).forEach(handler => handler());
			}
		}
	}

	export namespace location {
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
				throw new fugazi.Exception("module can only be js or json");
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

		fugazi.dom.ready(() => {
			baseUrl = current();
		});
	}

	fugazi.dom.ready(kickstart);
}