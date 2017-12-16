import * as terminal from "./terminal";
import * as view from "./view";
import * as utils from "../core/utils";
import * as coreTypes from "../core/types";
import * as React from "react";
import * as ReactDOM from "react-dom";

export interface MainProperties extends view.ViewProperties {
}

export function render(container: HTMLElement, properties?: MainProperties): MainView {
	return ReactDOM.render(<MainView { ...properties } />, container) as MainView;
}

export interface MainState extends view.ViewState {
	terminals: terminal.TerminalProperties[];
}

export class MainView extends view.View<MainProperties, MainState> implements terminal.TerminalFactory {
	constructor(properties: MainProperties) {
		super(properties);
		this.state = {terminals: []};
	}

	public createTerminal(properties: terminal.TerminalProperties): Promise<terminal.TerminalView> {
		const terminals: terminal.TerminalProperties[] = this.state.terminals.clone(),
			future = new coreTypes.Future<terminal.TerminalView>();

		terminals.push(properties);

		this.setState({
			terminals: terminals
		}, function () {
			future.resolve(this.refs[properties.name]);
		}.bind(this));

		return future.asPromise();
	}

	public render(): JSX.Element {
		let terminals: JSX.Element[] = [];

		for (let i = 0; i < this.state.terminals.length; i++) {
			terminals.push(<terminal.TerminalView
				key={ this.state.terminals[i].name }
				ref={ this.state.terminals[i].name }
				name={ this.state.terminals[i].name }
				title={ this.state.terminals[i].title }
				description={ this.state.terminals[i].description }
				history={ this.state.terminals[i].history }
				querier={ this.state.terminals[i].querier }
				executer={ this.state.terminals[i].executer }
			/>);
		}

		return (
			<div id="terminals">
				{ terminals }
			</div>);
	}
}
