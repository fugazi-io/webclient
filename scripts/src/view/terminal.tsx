import * as output from "./output";
import * as baseInput from "./input/base";
import * as view from "./view";
import * as fugaziInput from "./input/fugaziInput";
import * as statements from "../app/statements";
import * as componentsDescriptor from "../components/components.descriptor";
import * as commands from "../components/commands";
import * as commandsHandler from "../components/commands.handler";
import * as React from "react";

export interface TerminalFactory {
	createTerminal(properties: TerminalProperties): Promise<TerminalView>;
}

export interface ExecuteCommand {
	(command: string): commands.ExecutionResult;
}

export interface StatementsQuerier {
	(command: string, position: number): Promise<statements.Statement[]>;
}

export interface TerminalProperties extends componentsDescriptor.Descriptor, view.ViewProperties {
	executer: ExecuteCommand;
	querier: StatementsQuerier;
	history?: string[];
}

export interface TerminalState extends view.ViewState {
	promptMode: boolean;
	searchHistoryMode: boolean;
	searchHistoryResult?: string;
}

export class TerminalView extends view.View<TerminalProperties, TerminalState> {
	private promptInfo: {
		input: string;
		executionResult: commands.ExecutionResult;
		promptResult: commandsHandler.PromptResult;
	};

	public constructor(props: TerminalProperties) {
		super(props);

		this.state = {
			promptMode: false,
			searchHistoryMode: false
		};
	}

	public clearOutput(): void {
		this.getOutput().clear();
	}

	public render(): JSX.Element {
		let inputView: JSX.Element;

		if (this.state.promptMode) {
			inputView = <baseInput.PromptInputView
				handler={ this.handlePromptValue.bind(this) }
				message={ this.promptInfo.promptResult.message }
				type={ this.promptInfo.promptResult.type === "password" ? "password" : "text" } />
		} else if (this.state.searchHistoryMode) {
			inputView = <fugaziInput.SearchHistoryInputView
				history={ this.props.history }
				resultHandler={ this.handleHistorySearchResult.bind(this) } />
		} else {
			inputView = <fugaziInput.FugaziInputView
				history={ this.props.history }
				searchResult={ this.state.searchHistoryResult }
				onQuery={ this.props.querier }
				onExecute={ this.onExecute.bind(this) }
				onSearchHistoryRequested={ this.switchToHistorySearch.bind(this) } />;
		}

		return <article className="terminal">
			<output.OutputView ref="output"/>
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

	private onExecute(input: string, currentResult?: commands.ExecutionResult): void {
		const result = this.props.executer(input);

		result.onPrompt(value => {
			this.promptInfo = { input, executionResult: result, promptResult: value };

			this.setState({
				promptMode: true
			} as TerminalState);
		});

		if (currentResult) {
			result.wrap(currentResult);
		} else {
			this.getOutput().addExecutionResult(input, result);
		}
	}

	private getOutput(): output.OutputView {
		return this.refs["output"] as output.OutputView;
	}

	private handlePromptValue(value: string) {
		const info = this.promptInfo;
		this.promptInfo = null;

		info.promptResult.handler(value);

		this.setState({
			promptMode: false
		} as TerminalState, () => {
			this.onExecute(info.input, info.executionResult);
		});
	}
}
