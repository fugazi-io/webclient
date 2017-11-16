import * as base from "./base";

import { History } from "../../app/terminal";

const HISTORY_SEARCH_PROMPT = "search history:";

export interface SearchHistoryInputProperties extends base.BackgroundTextInputProperties {
	resultHandler: (result: string) => void;
	history: History;
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

	protected onTabPressed(): boolean {
		// disable tab in history view
		return true;
	}

	private getMatch(value: string): string {
		let regex = new RegExp("^" + value),
			matches = this.props.history.items().filter(item => regex.test(item));

		return matches.length > 0 ? matches.first() : null;
	}
}
