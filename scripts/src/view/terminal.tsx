/// <reference path="../components/types.ts" />
/// <reference path="../components/components.ts" />
/// <reference path="../components/commands.ts" />

/// <reference path="output.tsx" />
/// <reference path="input/fugaziInput.tsx" />

"use strict";

module fugazi.view {
	export interface TerminalFactory {
		createTerminal(properties: TerminalProperties):  Promise<TerminalView>;
	}

	export interface ExecuteCommand {
		(command: string): components.commands.ExecutionResult;
	}

	export interface StatementsQuerier {
		(command: string, position: number): Promise<app.statements.Statement[]>;
	}

	export interface TerminalProperties extends components.descriptor.Descriptor, ViewProperties {
		executer: ExecuteCommand;
		querier: StatementsQuerier;
		history?: string[];
	}

	export interface TerminalState extends ViewState {
		promptMode: boolean;
		searchHistoryMode: boolean;
		searchHistoryResult?: string;
	}

	export class TerminalView extends View<TerminalProperties, TerminalState> {
		private promptValueHandler: (value: string) => void;

		public constructor(props: TerminalProperties) {
			super(props);

			this.state = {
				promptMode: false,
				searchHistoryMode: false
			};
		}

		public render(): JSX.Element {
			let inputView: JSX.Element;

			if (this.state.promptMode) {
				inputView = <input.PasswordInputView handler={ this.handlePassword.bind(this) } />
			} else if (this.state.searchHistoryMode) {
				inputView = <input.SearchHistoryInputView
					history={ this.props.history }
					resultHandler={ this.handleHistorySearchResult.bind(this) } />
			} else {
				inputView = <input.FugaziInputView
								history={ this.props.history }
								searchResult={ this.state.searchHistoryResult }
								onQuery={ this.props.querier }
								onExecute={ this.onExecute.bind(this) }
								onSearchHistoryRequested={ this.switchToHistorySearch.bind(this) } />;
			}

			return <article className="terminal">
						<OutputView ref="output" />
						<section className="inputs">
							{ inputView }
						</section>
					</article>;
		}

		private switchToHistorySearch(): void {
			this.setState({
				searchHistoryMode: true
			} as TerminalState);
		}

		private handleHistorySearchResult(result: string): void {
			this.setState({
				searchHistoryMode: false,
				searchHistoryResult: result
			} as TerminalState);
		}

		private onExecute(input: string): void {
			const result: components.commands.ExecutionResult = this.props.executer(input);

			result.then(value => {
				if (components.commands.handler.isPromptData(value)) {
					this.promptValueHandler = value.handlePromptValue;
					this.setState({
						promptMode: true
					} as TerminalState);
				}
			});

			this.getOutput().addExecutionResult(input, result);
		}

		private getOutput(): OutputView {
			return this.refs["output"] as OutputView;
		}

		private handlePassword(password: string) {
			if (password != null) {
				this.promptValueHandler(password);
			}
			this.promptValueHandler = null;

			this.setState({
				promptMode: false
			} as TerminalState);
		}
	}
}