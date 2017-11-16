import * as React from "react";

import { InputView, InputProperties } from "./base";

export type PromptResultHandler<T> = (value: T | null) => void; // null when canceled

export interface PromptProperties extends InputProperties {
	message: string;
}

export abstract class PromptInputView<T extends PromptProperties> extends InputView<T> {
	protected input: HTMLInputElement;

	public componentDidMount(): void {
		this.input.focus();
	}
}

export interface BooleanPromptProperties extends PromptProperties {
	input: "boolean";
	labels?: [string, string];
	handler: PromptResultHandler<boolean>;
}

export class BooleanPromptInputView extends PromptInputView<BooleanPromptProperties> {

}

export interface TextPromptProperties extends PromptProperties {
	input: "text" | "password";
	handler: PromptResultHandler<string>;
}

export class TextPromptInputView extends PromptInputView<TextPromptProperties> {
	protected getInnerElements(): JSX.Element[] {
		const parentElements = super.getInnerElements();

		return [
			<div></div>,
			<div>
				{ ...parentElements }
			</div>
		];
	}
	/*public render() {
		return (
			<article className="input prompt">
				<div className="container">
					<div className="message">
						<span>{ this.props.message }:</span>
					</div>
					<div className="inputbox">
						<input type={ this.props.input }
							onKeyDown={ this.onKeyDown.bind(this) }
							ref={ input => this.input = input } />
					</div>
				</div>
			</article>
		);
	}*/

	/*private onKeyDown(event: React.KeyboardEvent<any>) {
		if (event.key === "Enter") {
			this.props.handler(this.input.value);
		} else if (event.key === "Escape") {
			this.props.handler(null);
		}
	}*/
}

export interface SelectPromptProperties extends PromptProperties {
	input: "select";
	options: string[];
	handler: PromptResultHandler<[number, string]>;
}

export class SelectPromptInputView extends PromptInputView<SelectPromptProperties> {

}
