/// <reference path="../../lib/react.d.ts" />
/// <reference path="terminal.tsx" />

module fugazi.view {
	export interface MainProperties extends ViewProperties {}

	export function render(container: HTMLElement, properties?: MainProperties): MainView {
		return ReactDOM.render(<MainView { ...properties } />, container) as MainView;
	}
	
	export interface MainState extends ViewState {
		terminals: TerminalProperties[];
	}
	
	export class MainView extends View<MainProperties, MainState> implements TerminalFactory {
		constructor(properties: MainProperties) {
			super(properties);
			this.state = { terminals: [] };
		}

		public createTerminal(properties: TerminalProperties): Promise<TerminalView> {
			var terminals: TerminalProperties[] = this.state.terminals.clone(),
				future = new fugazi.Future<TerminalView>();

			terminals.push(properties);

			this.setState({
				terminals: terminals
			}, function() {
				future.resolve(this.refs[properties.name]);
			}.bind(this));

			return future.asPromise();
		}

		public render(): JSX.Element {
			let terminals: JSX.Element[] = [];

			for (var i = 0; i < this.state.terminals.length; i++) {
				terminals.push(<TerminalView
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

			return <div id="terminals">{ terminals }</div>;
		}
	}
}