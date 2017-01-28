/// <reference path="base.tsx" />

/**
 * Created by nitzan on 07/05/2016.
 */

namespace fugazi.view.input {
	import ViewProperties = fugazi.view.ViewProperties;
	let DEFAULT_FUGAZI_PROMPT = "fugazi //";
	let HISTORY_SEARCH_PROMPT = "search history:";

	export interface ExecuteHandler {
		(input: string): void;
	}

	export interface FugaziInputProperties extends SuggestibleInputProperties<app.statements.Statement> {
		onSearchHistoryRequested: () => void;
		onExecute: ExecuteHandler;
		onQuery: StatementsQuerier;
		searchResult?: string;
		history?: string[];
		prompt?: string;
	}

	export class FugaziInputView extends SuggestibleInputView<FugaziInputProperties, SuggestibleInputState<app.statements.Statement>, app.statements.Statement> {
		private history: History;

		constructor(props: FugaziInputProperties) {
			super(props, "fugazi", props.prompt || DEFAULT_FUGAZI_PROMPT);
			this.addKeyMapping(false, true, false, "R", this.onShowSearch.bind(this));

			if (this.props.searchResult && this.props.searchResult.length > 0 ) {
				this.state.value = this.props.searchResult;
			}
		}

		public componentDidMount(): void {
			super.componentDidMount();
			this.history = new History(this.inputbox, this.props.history);
		}

		public onChange(event: React.FormEvent<HTMLInputElement>): void {
			super.onChange(event);
			this.history.update();
			this.updateSuggestions(this.getValue(), this.getPosition());
		}

		protected getItemRenderer(): ItemRenderer<app.statements.Statement> {
			return (statement, index) => {
				return <StatementSuggestionItem key={ index.toString() } statement={ statement } />;
			}
		}

		protected onArrowUpPressed(): boolean {
			this.history.previous();
			this.updateSuggestions(this.getValue(), this.getValue().length);
			return false;
		}

		protected onArrowDownPressed(): boolean {
			this.history.next();
			this.updateSuggestions(this.getValue(), this.getValue().length);
			return false;
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

		private updateSuggestions(value: string, position: number): void {
			let promise = this.props.onQuery(value, position);
			promise.then(statements => {
				this.setState({
					suggestions: statements,
					value: this.inputbox.value
				} as any);
			});
		}

		protected onEnterPressed(): boolean {
			this.history.mark();
			this.props.onExecute(this.inputbox.value);
			this.inputbox.value = "";
			this.setState({
				value: "",
				showing: false
			});

			return false;
		}

		private onShowSearch(): void {
			this.history.mark();
			this.history.update();
			this.props.onSearchHistoryRequested();
		}
	}

	interface StatementSuggestionItemProperties extends ViewProperties {
		statement: app.statements.Statement;
	}

	class StatementSuggestionItem extends View<StatementSuggestionItemProperties, ViewState> {
		render(): JSX.Element {
			let elements: JSX.Element[] = [];
			
			elements.push(<span key="path" className="path">{ this.props.statement.getCommand().getPath().parent().toString() }</span>);
			this.props.statement.getRule().getTokens().forEach(token => {
				elements.push(StatementSuggestionItem.getElementFor(token));
			});

			return <li key={ this.props.key }>{ elements }</li>;
		}

		private static getElementFor(token: components.commands.syntax.RuleToken): JSX.Element {
			if (token.getTokenType() == components.commands.syntax.TokenType.Keyword) {
				let word = (token as components.commands.syntax.Keyword).getWord();
				return <span key={ word } className="keyword">{ word }</span>;
			} else if (token.getTokenType() == components.commands.syntax.TokenType.Parameter) {
				let typeClassName = "parameter ",
					type = (token as components.commands.syntax.Parameter).getType();

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

				let name = (token as components.commands.syntax.Parameter).getName();
				return <span key={ name } className={ typeClassName }>
					<span className="name">{ name }</span>
					<span className="separator">|</span>
					<span className="type">{ (token as components.commands.syntax.Parameter).getType().toString() }</span>
				</span>;
			} else {
				return null;
			}
		}
	}

	export interface SearchHistoryInputProperties extends BackgroundTextInputProperties {
		resultHandler: (result: string) => void;
		history: string[];
	}

	export class SearchHistoryInputView extends BackgroundTextInput<SearchHistoryInputProperties, BackgroundTextInputState> {
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
		private element: HTMLInputElement;
		private originals: string[];
		private cache: string[];
		private cursor: number;

		public constructor(element: HTMLInputElement, loaded?: string[]) {
			this.element = element;
			this.originals = loaded || [];
			this.reset();
		}

		public clear(): void {
			this.originals = [];
			this.reset();
		}

		public mark(): void {
			if (this.originals.first() !== this.element.value) {
				this.originals.unshift(this.element.value);
			}

			this.reset();
		}

		public update(): void {
			if (this.element.value.trim() !== "") {
				this.cache[this.cursor] = this.element.value;
			}
		}

		public previous(): void {
			if (this.cursor === this.cache.length - 1) {
				return;
			}

			this.element.value = this.cache[++this.cursor];
		}

		public next(): void {
			if (this.cursor == 0) {
				return;
			}

			this.element.value = this.cache[--this.cursor];
		}

		private reset(): void {
			this.cursor = 0;
			this.cache = this.originals.clone();
			this.cache.unshift("");
		}
	}
}