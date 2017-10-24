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
				validator={ this.state.terminals[i].validator }
			/>);
		}

		return (
			<div id="terminals">
				{ terminals }
				<GitHubRibbon />
			</div>);
	}
}

class GitHubRibbon extends React.Component {
	private static VERSIONS = [{
		src: "365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67",
		canonical: "red_aa0000"
	}, {
		src: "e7bbb0521b397edbd5fe43e7f760759336b5e05f/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f677265656e5f3030373230302e706e67",
		canonical: "green_007200"
	}, {
		src: "38ef81f8aca64bb9a64448d0d70f1308ef5341ab/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f6461726b626c75655f3132313632312e706e67",
		canonical: "darkblue_121621"
	}, {
		src: "652c5b9acfaddf3a9c326fa6bde407b87f7be0f4/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f6f72616e67655f6666373630302e706e67",
		canonical: "orange_ff7600"
	}, {
		src: "a6677b08c955af8400f44c6298f40e7d19cc5b2d/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f677261795f3664366436642e706e67",
		canonical: "gray_6d6d6d"
	}, {
		src: "52760788cde945287fbb584134c4cbc2bc36f904/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f77686974655f6666666666662e706e67",
		canonical: "white_ffffff"
	}];

	render() {
		const version = GitHubRibbon.VERSIONS[utils.random(0, GitHubRibbon.VERSIONS.length - 1)];
		const style = {
			position: "absolute",
			top: 0,
			right: 0,
			border: 0
		};

		return (
			<a target="_blank" href="https://github.com/fugazi-io/webclient">
				<img
					style={ style as React.CSSProperties }
					alt="Go to GitHub repo page"
					data-canonical-src={ `https://s3.amazonaws.com/github/ribbons/forkme_right_${ version.canonical }.png` }
					src={ `https://camo.githubusercontent.com/${ version.src }` }
				/>
			</a>
		);
	}
}
