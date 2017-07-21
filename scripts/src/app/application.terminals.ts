import * as appTerminal from "./terminal";
import * as viewTerminal from "../view/terminal";
import * as application from "./application";

const items: appTerminal.Terminal[] = [];

export function create(properties: appTerminal.Properties, viewFactory: viewTerminal.TerminalFactory): appTerminal.Terminal {
	var terminal: appTerminal.Terminal = new appTerminal.Terminal(properties, application.context, viewFactory);
	items.push(terminal);
	return terminal;
}