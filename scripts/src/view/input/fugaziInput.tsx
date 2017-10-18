import * as syntax from "../../components/syntax";
import * as statements from "../../app/statements";
import * as input from "../../app/input";
import * as terminal from "../terminal";
import * as view from "../view";
import * as base from "./base";
import * as React from "react";

const DEFAULT_FUGAZI_PROMPT = "fugazi //";
const HISTORY_SEARCH_PROMPT = "search history:";

export interface ExecuteHandler {
	(input: string): void;
}

export interface FugaziInputProperties extends base.SuggestibleInputProperties<statements.Statement> {
	onSearchHistoryRequested: () => void;
	onExecute: ExecuteHandler;
	onQuery: terminal.StatementsQuerier;
	searchResult?: string;
	history?: string[];
	prompt?: string;
}

export class FugaziInputView extends base.SuggestibleInputView<FugaziInputProperties, base.SuggestibleInputState<statements.Statement>, statements.Statement> {
	private history: History;
	private addingNewLine: boolean;

	constructor(props: FugaziInputProperties) {
		super(props, "fugazi", props.prompt || DEFAULT_FUGAZI_PROMPT);

		this.addingNewLine = false;
		this.addKeyMapping(this.onShowSearch.bind(this), "r", base.ModifierKey.CONTROL);
		this.addKeyMapping(this.onShiftEnter.bind(this), base.SpecialKey.ENTER, base.ModifierKey.SHIFT);

		if (this.props.searchResult && this.props.searchResult.length > 0) {
			this.state = { value: this.props.searchResult } as any;
		}
	}

	public componentDidMount(): void {
		super.componentDidMount();
		this.history = new History(this.props.history);
	}

	public onChange(event: React.FormEvent<HTMLInputElement>): void {
		// for some reason a new line is inserted automatically when this input is rendered with a value
		if (!this.addingNewLine && event.type === "change" && this.state.value + "\n" === this.getValue(event)) {
			return;
		}

		this.addingNewLine = false;

		super.onChange(event);
		this.history.update(this.getValue());
		this.updateSuggestions(this.getValue(), this.getPosition());
	}

	protected getItemRenderer(): base.ItemRenderer<statements.Statement> {
		return (statement, index, handler, selected) => {
			return <StatementSuggestionItem key={ index.toString() } index={ index } statement={ statement }
											handler={ handler } selected={ selected }/>;
		}
	}

	protected onArrowUpPressed(): boolean {
		if (this.getLinesCount() > 1 && this.getCurrentLine() > 1) {
			return false;
		}

		const newValue = this.history.previous();
		if (newValue === null) {
			return false;
		}

		this.updateSuggestions(newValue, this.getValue().length).then(() => {
			setTimeout(() => {
				this.setCaretPosition(this.getValue().length);
			}, 5);
		});

		return true;
	}

	protected onArrowDownPressed(): boolean {
		if (this.getLinesCount() > 1 && this.getCurrentLine() < this.getLinesCount()) {
			return false;
		}

		const newValue = this.history.next();
		if (newValue === null) {
			return false;
		}

		this.updateSuggestions(newValue, this.getValue().length).then(() => {
			setTimeout(() => {
				this.setCaretPosition(this.getValue().length);
			}, 5);
		});

		return true;
	}

	protected onArrowLeftPressed(): boolean {
		if (this.getPosition() > 0) {
			this.updateSuggestions(this.getValue(), this.getPosition() - 1);
		}
		return false;
	}

	protected onArrowRightPressed(): boolean {
		if (this.getPosition() < this.getValue().length) {
			this.updateSuggestions(this.getValue(), this.getPosition() + 1);
		}
		return false;
	}

	private updateSuggestions(value: string, position: number) {
		let onResult = this.props.onQuery(value, position);

		return new Promise((resolve, reject) => {
			onResult.then(statements => {
				this.setState({
					value,
					suggestions: statements
				} as any, () => resolve());
			}).catch(reject);
		});
	}

	protected onEnterPressed(): boolean {
		if (this.isCurrentlyInAString() || this.getValue()[this.getPosition() - 1] === "\\") {
			this.setState({
				value: this.getValue().substring(0, this.getPosition()) + "\n" + this.getValue().substring(this.getPosition())
			});
		} else if (!this.inputbox.value.empty()) {
			this.history.mark(this.inputbox.value);
			this.props.onExecute(this.inputbox.value);

			this.setState({
				value: "",
				showing: false,
				focus: "input"
			});
		}

		return true;
	}

	protected onSuggestionItemPressed(item: statements.Statement): void {
		let oldValueWords: string[] = this.getValue().split(" "),
			expressionsIterator = (item.getExpression() as input.CommandExpression).getExpressions().getIterator(),
			newValue: string = "",
			haveStoppedForParameter = false,
			tokenIterator = item.getRule().getTokens().getIterator();

		while (tokenIterator.hasNext()) {
			const token = tokenIterator.next();
			// by taking the value from the token we fix keyword typos
			if (token.getTokenType() === syntax.TokenType.Keyword) {
				newValue += `${(token as syntax.Keyword).getWord()} `;
				expressionsIterator.next();
			// taking the parameter as given
			// but if not Complete, we cannot farther automatically complete
			} else if (expressionsIterator.hasNext()) {
				let currentExpression = expressionsIterator.next();
				newValue += currentExpression.input + " ";
				if (currentExpression.state != input.ExpressionState.Complete) {
					break;
				}
			// in this case we need a parameter, but cannot complete it from the input, so we stop
			} else {
				haveStoppedForParameter = true;
				break;
			}
		}

		this.setState({
				// add (in practice, keep) space before parameter input
				value: haveStoppedForParameter ? newValue : newValue.trimRight(),
				showing: false,
				focus: "input"
			} as any,
			() => {
				this.updateSuggestions(this.getValue(), this.getValue().length);
				this.inputbox.focus();
				this.setCaretPosition(this.getValue().length);
			});
	}

	private onShiftEnter(): boolean {
		if (this.getValue().charAt(this.getPosition() - 1) === "\n") {
			return true;
		}

		this.addingNewLine = true;
		return false;
	}

	private onShowSearch(): boolean {
		this.history.mark(this.getValue());
		this.history.update(this.getValue());
		this.props.onSearchHistoryRequested();
		return true;
	}

	private isCurrentlyInAString(): boolean {
		const value = this.getValue();
		let quotesType: string | null = null;

		for (let i = 0; i < this.getPosition(); i++) {
			if (value[i] === "\\") {
				i++;
			} else if (value[i] === quotesType) {
				quotesType = null;
			} else if (quotesType !== null) {
				continue;
			} else if (value[i] === "\"" || value[i] === "'") {
				quotesType = value[i];
			}
		}

		return quotesType !== null;
	}
}

interface StatementSuggestionItemProperties extends view.ViewProperties {
	index: number;
	selected: boolean;
	handler: base.ItemRendererMouseEventsHandler;
	statement: statements.Statement;
}

class StatementSuggestionItem extends view.View<StatementSuggestionItemProperties, view.ViewState> {
	render(): JSX.Element {
		let elements: JSX.Element[] = [];
		let className = this.props.selected ? "selected" : undefined;

		elements.push(<span key="__command-path__"
							className="path">{ this.props.statement.getCommand().getPath().parent().toString() }</span>);
		this.props.statement.getRule().getTokens().forEach(token => {
			elements.push(StatementSuggestionItem.getElementFor(token));
		});

		return (
			<li

				className={ className }
				onMouseEnter={ () => this.props.handler.onEnter(this.props.index) }
				onMouseLeave={ () => this.props.handler.onLeave(this.props.index) }
				onClick={ () => this.props.handler.onClick(this.props.index) }>
				{ elements }
			</li>
		);
	}

	private static getElementFor(token: syntax.RuleToken): JSX.Element {
		if (token.getTokenType() == syntax.TokenType.Keyword) {
			let word = (token as syntax.Keyword).getWord();
			return <span key={ word } className="keyword">{ word }</span>;
		} else if (token.getTokenType() == syntax.TokenType.Parameter) {
			let typeClassName = "parameter ",
				type = (token as syntax.Parameter).getType();

			if (type.is("string")) {
				typeClassName += "string";
			} else if (type.is("boolean")) {
				typeClassName += "boolean";
			} else if (type.is("number")) {
				typeClassName += "number";
			} else if (type.is("any")) {
				typeClassName += "any";
			} else if (type.is("list")) {
				typeClassName += "list";
			} else if (type.is("map")) {
				typeClassName += "map";
			}

			let name = (token as syntax.Parameter).getName(),
				typeName = (token as syntax.Parameter).getType().toString();
			return <span key={ name } className={ typeClassName }>
					<span className="name">{ name }</span>
					<span className="separator">|</span>
					<span className="type">{ typeName }</span>
				</span>;
		} else {
			return null;
		}
	}
}

export interface SearchHistoryInputProperties extends base.BackgroundTextInputProperties {
	resultHandler: (result: string) => void;
	history: string[];
}

export class SearchHistoryInputView extends base.BackgroundTextInput<SearchHistoryInputProperties, base.BackgroundTextInputState> {
	constructor(props: SearchHistoryInputProperties) {
		super(props, "historySearcher", HISTORY_SEARCH_PROMPT);
	}

	protected onEscapePressed(): boolean {
		this.props.resultHandler("");
		return false;
	}

	protected onChange(event: React.FormEvent<HTMLInputElement>): void {
		let bgtext: string,
			match = this.getMatch(this.getValue(event));

		super.onChange(event);
		if (match) {
			bgtext = match;
		} else {
			bgtext = this.getValue() + "  no matching results";
		}

		this.setState({
			backgroundText: bgtext
		});
	}

	protected onEnterPressed(): boolean {
		this.props.resultHandler(this.getMatch(this.inputbox.value));
		return false;
	}

	private getMatch(value: string): string {
		let regex = new RegExp("^" + value),
			matches = this.props.history.filter(item => regex.test(item));

		return matches.length > 0 ? matches.first() : null;
	}
}

class History {
	private originals: string[];
	private cache: string[];
	private cursor: number;

	public constructor(loaded?: string[]) {
		this.originals = loaded || [];
		this.reset();
	}

	public clear(): void {
		this.originals = [];
		this.reset();
	}

	public mark(value: string): void {
		if (this.originals.first() !== value) {
			this.originals.unshift(value);
		}

		this.reset();
	}

	public update(value: string): void {
		if (value.trim() !== "") {
			this.cache[this.cursor] = value;
		}
	}

	public previous(): string | null {
		if (this.cursor === this.cache.length - 1) {
			return null;
		}

		return this.cache[++this.cursor];
	}

	public next(): string | null {
		if (this.cursor == 0) {
			return null;
		}

		return this.cache[--this.cursor];
	}

	private reset(): void {
		this.cursor = 0;
		this.cache = this.originals.clone();
		this.cache.unshift("");
	}
}
