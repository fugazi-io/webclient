import * as terminal from "./terminal";
import * as viewTerminal from "../view/terminal";
import * as application from "./application";

const items: terminal.Terminal[] = [];

export function create(properties: terminal.Properties, viewFactory: viewTerminal.TerminalFactory): terminal.Terminal {
	var terminal: terminal.Terminal = new terminal.Terminal(properties, application.context, viewFactory);
	items.push(terminal);
	return terminal;
}