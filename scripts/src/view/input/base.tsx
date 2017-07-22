import * as collections from "../../core/types.collections";
import * as utils from "../../core/utils";
import * as coreTypes from "../../core/types";
import * as view from "../view";
import * as React from "react";
import * as ReactDOM from "react-dom";

export interface PasswordInputViewProperties extends view.ViewProperties {
	handler: (password: string | null) => void; // null when canceled
}

export class PasswordInputView extends view.View<PasswordInputViewProperties, view.ViewState> {
	private input: HTMLInputElement;

	public componentDidMount(): void {
		this.input.focus();
	}

	public render() {
		return (
			<article className="input password">
				<div className="container">
					<div className="inputbox">
						<input type="password" onKeyDown={ this.onKeyDown.bind(this) }
							   ref={ input => this.input = input }/>
					</div>
				</div>
			</article>
		);
	}

	private onKeyDown(event: React.KeyboardEvent<any>) {
		if (event.key === "Enter") {
			this.props.handler(this.input.value);
		} else if (event.key === "Escape") {
			this.props.handler(null);
		}
	}
}

export interface InputViewConstructor {
	new(props: InputProperties): InputView<InputProperties, InputState>;
}

export interface InputProperties extends view.ViewProperties {
	value?: string;
}

export interface InputState extends view.ViewState {
	value?: string;
}

export abstract class InputView<P extends InputProperties, S extends InputState> extends view.View<P, S> {
	private prompt: string;
	private className: string[];
	private keymap: collections.Map<() => void>;

	protected inputbox: HTMLInputElement;

	public constructor(props: P, className: string, prompt?: string) {
		super(props);


		this.prompt = prompt;
		this.className = ["input", className];
		this.keymap = collections.map<() => void>();
		this.state = {value: this.props.value || ""} as any;
	}

	public componentDidMount(): void {
		this.inputbox = ReactDOM.findDOMNode<HTMLInputElement>(this.refs["inputbox"] as React.ClassicComponent<any, any>);
		this.inputbox.focus();
		this.setCaretPosition(this.getValue().length);
	}

	public render(): JSX.Element {
		return <article className={ this.className.join(" ") }>
			{ this.getInnerElements() }
		</article>;
	}

	protected getPosition(): number {
		return this.inputbox.selectionStart;
	}

	protected getValue(event?: React.FormEvent<HTMLInputElement>): string {
		//return event ? event.target.value : this.inputbox.value;
		return event ? event.currentTarget.value : this.inputbox.value;
	}

	protected setCaretPosition(index: number): void {
		this.inputbox.setSelectionRange(index, index);
	}

	protected getInnerElements(): JSX.Element[] {
		let elements: JSX.Element[] = [];

		if (this.prompt) {
			elements.push(<aside key="prompt" className="prompt"
								 onClick={ (event) => this.inputbox.focus() }>{ this.prompt }</aside>);
		}

		elements.push(<div key="container" className="container">{ this.getContainerElements() }</div>);

		return elements;
	}

	protected getContainerElements(): JSX.Element[] {
		return [
			<div key="inputbox" className="inputbox">
				<input tabIndex={ -1 } key="input" type="text" ref="inputbox" value={ this.state.value }
					   onFocus={ this.onFocus.bind(this) }
					   onBlur={ this.onBlur.bind(this) }
					   onChange={ this.onChange.bind(this) }
					   onCopy={ this.onCopy.bind(this) }
					   onCut={ this.onCut.bind(this) }
					   onPaste={ this.onPaste.bind(this) }
					   onKeyUp={ this.onKeyUp.bind(this) }
					   onKeyPress={ this.onKeyPress.bind(this) }
					   onKeyDown={ this.onKeyDown.bind(this) }/>
			</div>];
	}

	protected addKeyMapping(alt: boolean, ctrl: boolean, shift: boolean, char: string, fn: () => void): void {
		let key = "";

		if (alt) {
			key += "A";
		}

		if (ctrl) {
			key += "C";
		}

		if (shift) {
			key += "S";
		}

		key += "+" + char.toUpperCase();
		this.keymap.set(key, fn);
	}

	// React/DOM events
	protected onFocus(event: React.FocusEventHandler<any>): void {
	}

	protected onBlur(event: React.FocusEventHandler<any>): void {
	}

	protected onCopy(event: React.ClipboardEventHandler<any>): void {
	}

	protected onCut(event: React.ClipboardEventHandler<any>): void {
	}

	protected onPaste(event: React.ClipboardEventHandler<any>): void {
	}

	protected onKeyUp(event: React.KeyboardEvent<any>): void {
	}

	protected onKeyPress(event: React.KeyboardEvent<any>): void {
	}

	protected onKeyDown(event: React.KeyboardEvent<any>): void {
		let stopPropagation: boolean;

		if (event.altKey || event.ctrlKey || event.shiftKey) {
			if (event.which < 20) {
				return;
			}

			let key = createEventSequenceKey(event);
			if (this.keymap.has(key)) {
				this.keymap.get(key)();
			}
		} else {
			switch (event.key) {
				case "Tab":
					stopPropagation = this.onTabPressed();
					break;

				case "Enter":
					stopPropagation = this.onEnterPressed();
					break;

				case "Escape":
					stopPropagation = this.onEscapePressed();
					break;

				case "ArrowUp":
					stopPropagation = this.onArrowUpPressed();
					break;

				case "ArrowDown":
					stopPropagation = this.onArrowDownPressed();
					break;

				case "ArrowLeft":
					stopPropagation = this.onArrowLeftPressed();
					break;

				case "ArrowRight":
					stopPropagation = this.onArrowRightPressed();
					break;
			}
		}

		if (stopPropagation) {
			event.stopPropagation();
			event.preventDefault();
		}
	}

	protected onChange(event: React.FormEvent<HTMLInputElement>): void {
		this.setState({
			value: this.getValue(event)
		} as any);
	}

	// custom events
	protected onTabPressed(): boolean {
		return false;
	}

	protected onEnterPressed(): boolean {
		return false;
	}

	protected onEscapePressed(): boolean {
		return false;
	}

	protected onArrowUpPressed(): boolean {
		return false;
	}

	protected onArrowDownPressed(): boolean {
		return false;
	}

	protected onArrowLeftPressed(): boolean {
		return false;
	}

	protected onArrowRightPressed(): boolean {
		return false;
	}
}

export interface SuggestibleInputProperties<T> extends InputProperties {
	suggestions?: T[];
}

export type FocusType = "input" | "suggestions";

export interface SuggestibleInputState<T> extends InputState {
	showing: boolean;
	message?: string;
	suggestions?: T[];
	focus: FocusType;
}

export type ItemRendererMouseEventsHandler = {
	onEnter(index: number): void;
	onLeave(index: number): void;
	onClick(index: number): void;
};
export type ItemRenderer<T> = (item: T, index: number, handler: ItemRendererMouseEventsHandler, selected: boolean) => JSX.Element;

export abstract class SuggestibleInputView<P extends SuggestibleInputProperties<T>, S extends SuggestibleInputState<T>, T> extends InputView<P, S> {
	private suggestionPanel: SuggestionPanel;

	public constructor(props: P, className: string, prompt?: string) {
		super(props, "suggestible " + className, prompt);
		this.state = {
			showing: false,
			message: null,
			suggestions: this.props.suggestions,
			focus: "input"
		} as any;


	}

	protected onTabPressed(): boolean {
		let newState = !this.state.showing ?
			{
				showing: true
			} :
			{
				focus: this.state.focus === "input" ? "suggestions" : "input"
			};

		this.setState(newState as S, () => {
			if (this.state.focus === "input") {
				this.suggestionPanel.blur();
				this.inputbox.focus();
				this.setCaretPosition(this.getValue().length);
			} else {
				this.suggestionPanel.focus();
			}
		});

		return true;
	}

	protected onEscapePressed(): boolean {
		this.setState({showing: false} as S, () => {
			this.inputbox.focus();
			this.setCaretPosition(this.getValue().length)
		});

		return false;
	}

	protected getInnerElements(): JSX.Element[] {
		let elements = super.getInnerElements();

		elements.push(<SuggestionPanel
			key="suggestions"
			showing={ this.state.showing }
			message={ this.state.message }
			items={ this.state.suggestions || [] }
			itemRenderer={ this.getItemRenderer() }
			ref={ element => this.suggestionPanel = element }
			onTabPressed={ this.onTabPressed.bind(this) }
			onEscapePressed={ this.onEscapePressed.bind(this) }
			onSuggestionItemPressed={ this.onSuggestionItemPressed.bind(this) }/>);

		return elements;
	}

	protected abstract getItemRenderer(): ItemRenderer<T>;

	protected abstract onSuggestionItemPressed(item: T): void;
}

interface SuggestionPanelProperties extends view.ViewProperties {
	itemRenderer: ItemRenderer<any>;
	showing: boolean;
	message?: string;
	items?: any[];
	onTabPressed: () => void;
	onEscapePressed: () => void;
	onSuggestionItemPressed: (item: any) => void;
}

export interface SuggestionPanelState extends view.ViewState {
	selected: number;
}

class SuggestionPanel extends view.View<SuggestionPanelProperties, SuggestionPanelState> {
	private key: string;
	private element: HTMLElement;
	private isFocused: boolean;

	constructor(props: SuggestionPanelProperties, className: string, prompt?: string) {
		super(props);
		this.key = utils.generateId();
		this.state = {
			selected: -1
		} as any;
	}

	public render(): JSX.Element {
		let counter = 0,
			className = "suggestionPanel " + (this.props.showing ? "" : "hidden"),
			item: JSX.Element;

		if (this.props.message) {
			item = <span key={ "span1" + this.key } className="message">{ this.props.message }</span>;
		} else if (this.props.items) {
			if (this.props.items.empty()) {
				item = <span key={ "span2" + this.key } className="message empty">no matches found</span>
			} else {
				const handler = {
					onClick: (index: number) => {
						this.selectSuggestionItem(index);
						this.props.onSuggestionItemPressed(this.props.items[this.state.selected]);
					},
					onEnter: (index: number) => {
						this.selectSuggestionItem(index);
					},
					onLeave: (index: number) => {
						this.selectSuggestionItem(this.isFocused ? index : -1);
					}
				};

				item = <ul key={ "ul" + this.key }>{ this.props.items.map(item => {
					return this.props.itemRenderer(item, counter, handler, this.state.selected === counter++);
				}) }</ul>;
			}
		} else {
			throw new coreTypes.Exception("SuggestionPanel.render: both props.message and props.items are missing");
		}

		return <div tabIndex={ -1 } key={ "div" + this.key } onKeyDown={ this.onKeyDown.bind(this) }
					className={ className } ref={ el => this.element = el }>{ item }</div>;
	}

	public focus() {
		this.isFocused = true;

		this.setState({
			selected: 0
		}, () => {
			this.element.focus();
		});
	}

	public blur() {
		this.isFocused = false;

		this.setState({
			selected: -1
		}, () => {
			this.element.blur();
		});
	}

	private selectSuggestionItem(index: number) {
		this.setState({
			selected: index
		});
	}

	private onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
		switch (event.key) {
			case "Enter":
				event.stopPropagation();
				event.preventDefault();
				this.props.onSuggestionItemPressed(this.props.items[this.state.selected]);
				break;

			case "Tab":
				event.stopPropagation();
				event.preventDefault();
				this.selectSuggestionItem(-1);
				this.props.onTabPressed();
				break;

			case "Escape":
				event.stopPropagation();
				event.preventDefault();
				this.selectSuggestionItem(-1);
				this.props.onEscapePressed();
				break;

			case "ArrowUp":
				this.selectSuggestionItem((this.props.items.length + this.state.selected - 1) % this.props.items.length);
				break;

			case "ArrowDown":
				this.selectSuggestionItem((this.state.selected + 1) % this.props.items.length);
				break;
		}
	}
}

export interface BackgroundTextInputProperties extends InputProperties {
	backgroundText?: string;
}

export interface BackgroundTextInputState extends InputState {
	backgroundText: string;
}

export class BackgroundTextInput<P extends BackgroundTextInputProperties, S extends BackgroundTextInputState> extends InputView<P, S> {
	public constructor(props: P, className: string, prompt?: string) {
		super(props, "bgtext " + className, prompt);

		this.state = {
			backgroundText: this.props.backgroundText || ""
		}as any;
	}

	protected getContainerElements(): JSX.Element[] {
		let elements = super.getContainerElements();
		elements.push(<div key="bgtextbox" className="bgtextbox"><BackgroundTextBox text={ this.state.backgroundText }/>
		</div>);
		return elements;
	}
}

interface BackgroundTextBoxProperties extends view.ViewProperties {
	text: string;
}

class BackgroundTextBox extends view.View<BackgroundTextBoxProperties, view.ViewState> {
	constructor(props: BackgroundTextBoxProperties) {
		super(props);
	}

	public render(): JSX.Element {
		return <input key="bgtextboxinput" type="text" value={ this.props.text }/>
	}
}

function createEventSequenceKey(event: React.KeyboardEvent<any>): string {
	let key = "";

	if (event.altKey) {
		key += "A";
	}

	if (event.ctrlKey) {
		key += "C";
	}

	if (event.shiftKey) {
		key += "S";
	}

	key += "+" + String.fromCharCode(event.which).toUpperCase();

	return key;
}
