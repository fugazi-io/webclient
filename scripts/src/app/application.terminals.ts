import * as appTerminal from "./terminal";
import * as viewTerminal from "../view/terminal";
import * as application from "./application";

const items: appTerminal.Terminal[] = [];

export function create(properties: appTerminal.Properties, viewFactory: viewTerminal.TerminalFactory): appTerminal.Terminal {
	const terminal = new appTerminal.Terminal(properties, application.getContext(), viewFactory);
	items.push(terminal);
	return terminal;
}
