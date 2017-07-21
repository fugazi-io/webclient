import "../core/polyfill";

import * as location from "./application.location";
import * as bus from "./application.bus";
import {ApplicationContext, setContext, setMainView} from "./application";
import * as storage from "./storage";
import * as terminal from "./terminal";
import * as terminals from "./application.terminals";
import * as viewMain from "../view/main";
import * as viewTerminal from "../view/terminal";
import * as dom from "../core/dom";
import * as registry from "../components/registry";
import {Events} from "./constants";


function kickstart(): void {
	setContext(new ApplicationContext());

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

	let newMainView = viewMain.render(<HTMLElement> dom.get("main#ui"));
	setMainView(newMainView);

	terminals.create(properties, newMainView);
}

dom.ready(kickstart);