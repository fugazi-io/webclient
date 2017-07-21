import * as location from "./application.location";
import * as bus from "./application.bus";
import * as storage from "./storage";
import * as terminal from "./terminal";
import * as terminals from "./application.terminals";
import * as viewMain from "../view/main";
import * as viewTerminal from "../view/terminal";
import * as utils from "../core/utils";
import * as dom from "../core/dom";
import * as registry from "../components/registry";
import * as converters from "../components/converters";
import * as types from "../components/types";

export const version = {
	code: "1.0.16",
	name: "The Argument",
	toString: function () {
		return `${ this.name } (${ this.code })`;
	}
};

export const Events = {
	Loaded: "app.loaded",
	Ready: "app.ready"
};

export var context: ApplicationContext,
	mainView: viewMain.MainView,
	CONTEXT_ID_PARAMS: utils.GenerateIdParameters = {
		min: 5,
		max: 10,
		prefix: "context:"
	};

export type Variable = {
	name: string,
	type: types.Type,
	value: any
}

export interface Context {
	getId(): string;

	guessType(value: any): types.Type;
	guessTypeFromString(value: string): types.Type;

	getConverter(from: types.Type, to: types.Type): converters.Converter;
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

	public guessType(value: any): types.Type {
		return registry.guessType(value);
	}

	public guessTypeFromString(value: string): types.Type {
		return registry.guessTypeFromString(value);
	}

	public getConverter(from: types.Type, to: types.Type): converters.Converter {
		return registry.getConverter(from, to);
	}
}

export class ApplicationContext extends BaseContext<null> {
}

function kickstart(): void {
	context = new ApplicationContext();

	storage.initialize({useCompression: false});

	bus.register(registry.Events.Ready, () => {
		registry.load({augment: true, url: location.modules("base.json")}).then(() => {
			bus.post(Events.Ready);
			showView();
		});
	});

	bus.post(Events.Loaded);
}

function showView() {
	let name: string = "terminal", //utils.generateId({ prefix: "terminal", min: 5, max: 10 }),
		terminal: viewTerminal.TerminalView;

	let properties: terminal.Properties = storage.local.fetch<terminal.Properties>(name);
	if (properties == null) {
		properties = {
			name: name,
			title: "le terminal",
			history: []
		}
	}

	mainView = viewMain.render(<HTMLElement> dom.get("main#ui"));

	terminals.create(properties, mainView);
}

dom.ready(kickstart);
