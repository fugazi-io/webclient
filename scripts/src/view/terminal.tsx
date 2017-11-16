import * as output from "./output";
import * as baseInput from "./input/base";
import * as view from "./view";
import * as fugaziInput from "./input/fugaziInput";
import * as statements from "../app/statements";
import * as componentsDescriptor from "../components/components.descriptor";
import * as commands from "../components/commands";
import * as commandsHandler from "../components/commands.handler";
import * as React from "react";

import { setUIProvider, UIServiceProvider } from "../app/application";

export interface TerminalFactory {
	createTerminal(properties: TerminalProperties): Promise<TerminalView>;
}

export type CommandExecuter = () => commands.ExecutionResult;

export type CommandValidationResult = Promise<CommandExecuter>;

export type CommandValidator = (command: string) => CommandValidationResult;

export interface StatementsQuerier {
	(command: string, position: number): Promise<statements.Statement[]>;
}

export interface TerminalProperties extends componentsDescriptor.Descriptor, view.ViewProperties {
	validator: CommandValidator;
	querier: StatementsQuerier;
	history?: string[];
}

export interface TerminalState extends view.ViewState {
	promptMode: boolean;
	searchHistoryMode: boolean;
	searchHistoryResult?: string;
}

export class TerminalView extends view.View<TerminalProperties, TerminalState> implements UIServiceProvider {
	private promptValueHandler: (value: string) => void;

	public constructor(props: TerminalProperties) {
		super(props);

		this.state = {
			promptMode: false,
			searchHistoryMode: false
		};

		setUIProvider(this);
	}

	public promptFor(message: string, type?: "string" | "password"): Promise<string> {
		return null;
	}

	public showSuggestions(): Promise<string> {
		this.setState({
			suggestions: statements,
			value: inputbox.value
		} as any;

		return null;
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

		return (
			<article className="terminal">
				<output.OutputView ref="output"/>
				<section className="inputs">
					{ inputView }
				</section>
			</article>
		);
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
		this.props.validator(input)
			.then(executer => {
				const result = executer();
				this.getOutput().addExecutionResult(input, result);

				result.then(value => {
					if (commandsHandler.isPromptData(value)) {
						this.promptValueHandler = value.handlePromptValue;
						this.setState({
							promptMode: true
						} as TerminalState);
					}
				});
			})
			.catch(e => {
				// TODO: handler this case
			});
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
