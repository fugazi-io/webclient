import * as output from "./output";
import * as baseInput from "./input/base";
import * as view from "./view";
import * as fugaziInput from "./input/fugaziInput";
import * as statements from "../app/statements";
import * as utils from "../core/utils";
import * as collections from "../core/types.collections";
import * as coreTypes from "../core/types";
import * as net from "../core/net";
import * as components from "../components/components";
import * as componentsBuilder from "../components/components.builder";
import * as componentsDescriptor from "../components/components.descriptor";
import * as types from "../components/types";
import * as syntax from "../components/syntax";
import * as commands from "../components/commands";
import * as commandsHandler from "../components/commands.handler";
import * as handler from "../components/commands.handler";
import * as descriptor from "../components/commands.descriptor";
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
	private promptValueHandler: (value: string) => void;

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
			inputView = <baseInput.PasswordInputView handler={ this.handlePassword.bind(this) }/>
		} else if (this.state.searchHistoryMode) {
			inputView = <fugaziInput.SearchHistoryInputView
				history={ this.props.history }
				resultHandler={ this.handleHistorySearchResult.bind(this) }/>
		} else {
			inputView = <fugaziInput.FugaziInputView
				history={ this.props.history }
				searchResult={ this.state.searchHistoryResult }
				onQuery={ this.props.querier }
				onExecute={ this.onExecute.bind(this) }
				onSearchHistoryRequested={ this.switchToHistorySearch.bind(this) }/>;
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

	private onExecute(input: string): void {
		const result: commands.ExecutionResult = this.props.executer(input);

		result.then(value => {
			if (commandsHandler.isPromptData(value)) {
				this.promptValueHandler = value.handlePromptValue;
				this.setState({
					promptMode: true
				} as TerminalState);
			}
		});

		this.getOutput().addExecutionResult(input, result);
	}

	private getOutput(): output.OutputView {
		return this.refs["output"] as output.OutputView;
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
