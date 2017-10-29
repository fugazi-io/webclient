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

export class KeyEnum {
	public readonly code: number;
	public readonly name: string;
	public readonly ordinal: number;

	protected constructor(code: number, name: string, ordinal: number) {
		this.code = code;
		this.name = name;
		this.ordinal = ordinal;
	}
}

export class ModifierKey extends KeyEnum {
	private static COUNTER = 0;
	private static VALUES: ModifierKey[] = [];

	public static NONE = new ModifierKey(-1, "None");
	public static ALT = new ModifierKey(18, "Alt");
	public static SHIFT = new ModifierKey(16, "Shift");
	public static CONTROL = new ModifierKey(17, "Ctrl");

	public readonly flag: number;

	private constructor(code: number, name: string) {
		super(code, name, ModifierKey.COUNTER++);

		if (code < 0) {
			this.flag = 0;
		} else {
			this.flag = 1 << this.ordinal;
		}

		ModifierKey.VALUES.push(this);
	}

	public static values() {
		return this.VALUES;
	}

	public static flagsFromEvent(event: React.KeyboardEvent<any>): number {
		let flags = 0;

		if (event.altKey) {
			flags |= ModifierKey.ALT.flag;
		}
		if (event.ctrlKey) {
			flags |= ModifierKey.CONTROL.flag;
		}
		if (event.shiftKey) {
			flags |= ModifierKey.SHIFT.flag;
		}

		return flags;
	}
}

export class SpecialKey extends KeyEnum {
	private static COUNTER = 0;
	private static VALUES: SpecialKey[] = [];

	public static TAB = new SpecialKey(9, "Tab");
	public static ENTER = new SpecialKey(13, "Enter");
	public static DELETE = new SpecialKey(8, "Del");
	public static ESCAPE = new SpecialKey(27, "Esc");

	private constructor(code: number, name: string) {
		super(code, name, SpecialKey.COUNTER++);

		SpecialKey.VALUES.push(this);
	}

	public static values() {
		return this.VALUES;
	}
}

export abstract class InputView<
		P extends InputProperties = InputProperties,
		S extends InputState = InputState,
		I extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement> extends view.View<P, S> {
	private prompt: string;
	private className: string[];
	private keymap: Map<string, () => boolean>;

	protected inputbox: I;

	public constructor(props: P, className: string, prompt?: string) {
		super(props);

		this.prompt = prompt;
		this.className = ["input", className];
		this.keymap = new Map<string, () => boolean>();
		this.state = {
			value: this.props.value || ""
		} as S;
	}

	public componentDidMount(): void {
		this.inputbox.focus();
		this.setCaretPosition(this.getValue().length);
	}

	public render(): JSX.Element {
		return (
			<article className={ this.className.join(" ") }>
				{ this.getInnerElements() }
			</article>
		);
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
		const type = this.getInputType(),
			props = this.getViewProperties();

		return [
			<div key="inputbox" className="inputbox">
				{ React.createElement(type, props) }
			</div>
		];
	}

	protected getInputType(): "input" | "textarea" {
		return "input";
	}

	protected getViewProperties() {
		return {
			key: "input",
			tabIndex: -1,
			ref: (el: I | null) => {
				this.inputbox = el;
				if (this.inputbox) {
					this.inputbox.focus();
				}
			},
			value: this.state.value,
			onCut: this.onCut.bind(this),
			onBlur: this.onBlur.bind(this),
			onCopy: this.onCopy.bind(this),
			onFocus: this.onFocus.bind(this),
			onPaste: this.onPaste.bind(this),
			onKeyUp: this.onKeyUp.bind(this),
			onChange: this.onChange.bind(this),
			onKeyDown: this.onKeyDown.bind(this),
			onKeyPress: this.onKeyPress.bind(this)
		};
	}

	protected addKeyMapping(cb: () => boolean, char: string | SpecialKey, ...modifiers: ModifierKey[]): void {
		this.keymap.set(createModifiersSequenceKey(char, ...modifiers), cb);
	}

	// React/DOM events
	protected onFocus(event: React.FocusEventHandler<any>): void {}

	protected onBlur(event: React.FocusEventHandler<any>): void {}

	protected onCopy(event: React.ClipboardEventHandler<any>): void {}

	protected onCut(event: React.ClipboardEventHandler<any>): void {}

	protected onPaste(event: React.ClipboardEventHandler<any>): void {}

	protected onKeyUp(event: React.KeyboardEvent<any>): void {}

	protected onKeyPress(event: React.KeyboardEvent<any>): void {}

	protected onKeyDown(event: React.KeyboardEvent<any>): void {
		const flags = ModifierKey.flagsFromEvent(event);
		let stopPropagation: boolean;

		if (flags | ModifierKey.NONE.flag) {
			const key = createEventSequenceKey(event);
			if (this.keymap.has(key)) {
				stopPropagation = this.keymap.get(key)();
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

export class TextInputView<P extends InputProperties, S extends InputState> extends InputView<P, S, HTMLTextAreaElement> {
	public constructor(props: P, className: string, prompt?: string) {
		super(props, className, prompt);
	}

	protected getInputType(): "input" | "textarea" {
		return "textarea";
	}

	protected getViewProperties() {
		let linesCount = 1;

		if (this.state.value) {
			linesCount += this.state.value.length - this.state.value.replace(/\n/g, "").length;
		}

		return Object.assign({}, super.getViewProperties(), { rows: Math.min(linesCount, 4) });
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

export abstract class SuggestibleInputView<P extends SuggestibleInputProperties<T>, S extends SuggestibleInputState<T>, T> extends TextInputView<P, S> {
	private suggestionPanel: SuggestionPanel;

	public constructor(props: P, className: string, prompt?: string) {
		super(props, "suggestible " + className, prompt);
		this.state = {
			showing: false,
			message: null,
			suggestions: this.props.suggestions,
			focus: "input"
		} as S;


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

	constructor(props: SuggestionPanelProperties) {
		super(props);
		this.key = utils.generateId();
		this.state = {
			selected: -1
		} as SuggestionPanelState;
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
		}as S;
	}

	protected getContainerElements(): JSX.Element[] {
		const elements = super.getContainerElements();

		elements.push(
			<div key="bgtextbox" className="bgtextbox">
				<BackgroundTextBox text={ this.state.backgroundText } />
			</div>
		);

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

function createModifiersSequenceKey(char: string | SpecialKey, ...specials: ModifierKey[]): string {
	return createSequenceKey(char, specials.reduce<number>((flags, modifier) => flags | modifier.flag, 0));
}

function createEventSequenceKey(event: React.KeyboardEvent<any>): string {
	return createSequenceKey(event.key, ModifierKey.flagsFromEvent(event));
}

function createSequenceKey(char: string | SpecialKey, flags: number) {
	let key = "";

	ModifierKey.values().forEach(modifier => {
		if (flags & modifier.flag) {
			key += modifier.name + "+";
		}
	});

	return key + (typeof char === "string" ? char : char.name);
}
