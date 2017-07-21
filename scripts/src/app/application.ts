import * as location from "./application.location";
import * as bus from "./application.bus";

/// <reference path="./storage.ts" />
/// <reference path="../core/configuration.ts" />
/// <reference path="../core/dom.ts" />
/// <reference path="../components/types.ts" />
/// <reference path="../components/registry.ts" />
/// <reference path="../view/main.tsx" />

"use strict";

module fugazi.app {
	export const version = {
		code: "1.0.16",
		name: "The Argument",
		toString: function() {
			return `${ this.name } (${ this.code })`;
		}
	};

	export const Events = {
		Loaded: "app.loaded",
		Ready: "app.ready"
	};

	export var context: ApplicationContext,
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

	fugazi.dom.ready(kickstart);
}