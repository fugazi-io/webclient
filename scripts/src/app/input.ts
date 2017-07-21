import * as coreTypes from "../core/types";
import * as collections from "../core/types.collections";
import * as utils from "../core/utils";

export interface Range {
	start: number;
	end: number;
	length: number;
}

class RangeImpl implements Range {
	private startIndex: number;
	private endIndex: number;

	constructor(start: number, end: number) {
		this.startIndex = start;
		this.endIndex = end;
	}

	get start(): number {
		return this.startIndex;
	}

	get end(): number {
		return this.endIndex;
	}

	get length(): number {
		return this.endIndex - this.startIndex;
	}
}

export class ParseException extends coreTypes.Exception {
	private index: number

	constructor(index?: number, message?: string) {
		super(message || "error parsing input");
		this.index = index || 0;
	}
}

export enum ExpressionState {
	Complete,
	Incomplete,
	Unknown
}

export class WordTransformer {
	public range: Range;
	public input: string;
	public state: ExpressionState;

	public canBeBoolean(): boolean {
		return this.input.test(/^true|false$/i);
	}

	public asBooleanParameter(): BooleanParameter {
		return new BooleanParameter(this.input, this.state, this.range);
	}

	public canBeNumber(): boolean {
		return !Number.isNaN(parseFloat(this.input));
	}

	public asNumberParameter(): NumberParameter {
		return new NumberParameter(this.input, this.state, this.range);
	}

	public asStringParameter(): StringParameter {
		return new StringParameter(this.input, this.state, this.range);
	}

	public guess(): Parameter<any> {
		if (this.canBeBoolean()) {
			return this.asBooleanParameter();
		} else if (this.canBeNumber()) {
			return this.asNumberParameter();
		}

		return this.asStringParameter();
	}
}

export class Expression<T> {
	private expressionRange: Range;
	private expressionState: ExpressionState;
	private expressionInput: string;

	protected expressionValue: T;

	constructor(input: string, state: ExpressionState, range: Range, value?: T) {
		this.expressionRange = range;
		this.expressionState = state;
		this.expressionInput = input;
		this.expressionValue = value;
	}

	get range(): Range {
		return this.expressionRange;
	}

	get state(): ExpressionState {
		return this.expressionState;
	}

	get value(): T {
		return this.expressionValue;
	}

	get input(): string {
		return this.expressionInput;
	}
}

export class CommandExpression extends Expression<Expression<any>[]> {
	public getExpressions(): Expression<any>[] {
		return <Expression<any>[]> this.value;
	}
}

export class Word extends Expression<string> implements WordTransformer {
	constructor(input: string, state: ExpressionState, range: Range) {
		super(input, state, range, input);
	}

	public asKeyword(): Keyword {
		return new Keyword(this.input, this.state, this.range, this.value);
	}

	public asParameter(): WordParameter<string> {
		return new WordParameter<string>(this.input, this.state, this.range);
	}

	public guess: () => Parameter<any>;
	public canBeNumber: () => boolean;
	public canBeBoolean: () => boolean;
	public asNumberParameter: () => NumberParameter;
	public asStringParameter: () => StringParameter;
	public asBooleanParameter: () => BooleanParameter;
}
utils.applyMixins(Word, [WordTransformer]);

export class Keyword extends Expression<string> {
}

export class Parameter<T> extends Expression<T> implements collections.Hashable {
	/**
	 * @override
	 */
	hash(): string {
		return this.value.toString();
	}
}

export class WordParameter<T> extends Parameter<T> implements WordTransformer {
	constructor(input: string, state: ExpressionState, range: Range, value?: any) {
		super(input, state, range, value || input);
	}

	public guess: () => Parameter<any>;
	public canBeNumber: () => boolean;
	public canBeBoolean: () => boolean;
	public asNumberParameter: () => NumberParameter;
	public asStringParameter: () => StringParameter;
	public asBooleanParameter: () => BooleanParameter;
}
utils.applyMixins(WordParameter, [WordTransformer]);

function toBoolean(input: string, range: Range): boolean {
	if (input.test(/true/i)) {
		return true;
	} else if (input.test(/false/i)) {
		return false;
	} else {
		throw new ParseException(range.start, input + " can not be converted to boolean");
	}
}

export class BooleanParameter extends WordParameter<boolean> {
	constructor(input: string, state: ExpressionState, range: Range) {
		super(input, state, range, toBoolean(input, range));
	}
}

function toNumber(input: string, range: Range): number {
	let num = parseFloat(input);

	if (isNaN(num)) {
		throw new ParseException(range.start, input + " can not be converted to number")
	}

	return num;
}

export class NumberParameter extends WordParameter<number> {
	constructor(input: string, state: ExpressionState, range: Range) {
		super(input, state, range, toNumber(input, range));
	}
}

export class StringParameter extends WordParameter<string> {
	constructor(input: string, state: ExpressionState, range: Range) {
		super(input, state, range);

		if (this.expressionValue.startsWith("\"") || this.expressionValue.startsWith("'")) {
			if (this.state === ExpressionState.Complete) {
				this.expressionValue = input.substring(1, input.length - 1);
			} else {
				this.expressionValue = input.substring(1);
			}
		}
	}
}

export abstract class CompoundParameter<Pt, Rt> extends Parameter<Pt> {
	public abstract getParameterValues(): Rt;
}

export class ListParameter extends CompoundParameter<Parameter<any>[], any[]> {
	public getParameterValues(): any[] {
		return this.expressionValue.map(param => {
			if (param instanceof CompoundParameter) {
				return param.getParameterValues();
			}

			return param.value;
		});
	}
}

export class WordsListParameter extends ListParameter {
	public normalize(): ListParameter {
		const items = [] as any[];

		this.value.forEach(item => {
			if (item instanceof WordParameter) {
				items.push(item.guess());
			} else {
				items.push(item);
			}
		});

		return new ListParameter(this.input, this.state, this.range, items);
	}
}

export class MapParameter extends CompoundParameter<collections.EntryMap<Parameter<any>, Parameter<any>>, collections.Map<any>> {
	public getParameterValues(): collections.Map<any> {
		let values = collections.map<any>();

		this.expressionValue.forEach((entry, key) => {
			if (entry.value instanceof CompoundParameter) {
				values.set(entry.key.value.toString(), (<CompoundParameter<any, any>> entry.value).getParameterValues());
			} else {
				values.set(entry.key.value.toString(), entry.value.value);
			}
		});

		return values;
	}
}

export class WordsMapParameter extends MapParameter {
	public normalize(): MapParameter {
		let map = new collections.EntryMap<Parameter<any>, Parameter<any>>();

		this.value.forEach(entry => {
			let key, value;

			if (entry.key instanceof WordParameter) {
				key = entry.key.guess();
			} else {
				key = entry.key;
			}

			if (entry.value instanceof WordParameter) {
				value = entry.value.guess();
			} else {
				value = entry.value;
			}

			map.setEntry(key, value);
		});

		return new MapParameter(this.input, this.state, this.range, map);
	}
}

export function parse(commandInput: string): CommandExpression {
	return parser.parse(commandInput);
}

module parser {
	var input: Input,
		stack: StateStack;

	export function parse(commandInput: string): CommandExpression {
		var state: ParserState<any>,
			command: CommandState;

		input = new Input(commandInput);
		command = new CommandState();
		stack = new StateStack();

		stack.push(command);
		while (!stack.empty) {
			state = stack.current;
			state.parse();

			if (state.getStatus() === StateStatus.Done) {
				stack.pop();

				if (!stack.empty) {
					(<CompoundState<any>> stack.current).addExpression(state.getExpression());
				}
			} else if (state.getStatus() === StateStatus.Pending) {
				stack.push((<CompoundState<any>> state).getInnerState());
			}
		}

		return command.getExpression();
	}

	interface UsedInput {
		value: string;
		range: RangeImpl;
	}

	class Input {
		private value: string;
		private used: number;
		private cursor: number;

		constructor(input: string) {
			this.value = input;
			this.used = 0;
			this.cursor = 0;
		}

		get index(): number {
			return this.cursor;
		}

		get current(): string {
			return this.value.charAt(this.cursor);
		}

		get asc(): number {
			return this.value.charCodeAt(this.cursor);
		}

		get eof(): boolean {
			return this.cursor >= this.value.length;
		}

		get space(): boolean {
			return this.current === " ";
		}

		skipSpaces(use: boolean = false): void {
			while (this.space) {
				this.cursor++;
			}

			if (use) {
				this.use();
			}
		}

		advance(use: boolean = false): void {
			this.cursor++;
			if (use) {
				this.use();
			}
		}

		throw(message: string, previous: boolean = false): void {
			throw new ParseException(previous ? this.cursor - 1 : this.cursor, message);
		}

		use(startIndex: number = this.used): UsedInput {
			var usedInput: UsedInput = {
				value: this.substring(startIndex, this.cursor),
				range: new RangeImpl(startIndex, this.cursor)
			};

			this.used = this.cursor;
			return usedInput;
		}

		substring(start: number, end?: number): string {
			return this.value.substring(start, end);
		}
	}

	class StateStack {
		private states: ParserState<any>[];

		constructor() {
			this.states = [];
		}

		get current(): ParserState<any> {
			return this.states.last();
		}

		get empty(): boolean {
			return this.states.length === 0;
		}

		push(state: ParserState<any>): void {
			this.states.push(state);
		}

		pop(): ParserState<any> {
			return this.states.remove(this.states.length - 1);
		}
	}

	enum StateStatus {
		Parsing,
		Done,
		Pending,
		Error
	}

	class ParserState<T extends Expression<any>> {
		protected start: number;
		protected expression: T;
		protected status: StateStatus;

		constructor() {
			this.expression = null;
			this.start = input.index;
			this.status = StateStatus.Parsing;
		}

		getStatus(): StateStatus {
			return this.status;
		}

		getExpression(): T {
			return this.expression;
		}

		parse(): StateStatus {
			return this.status;
		}

		protected parsingEnded(): boolean {
			return input.eof || input.space;
		}
	}

	class AtomicState<T extends Expression<any>> extends ParserState<T> {
	}

	class WordState extends AtomicState<Word> {
		private static ILLEGAL_CHARACTERS: string[] = ": \" ' [ ( { ,".split(" ");
		//private static ENDING_CHARACTERS: string[] = ") ] } , :".split(" ");
		private endingCharacters: string[];

		constructor(endingCharacters: string | string[] = []) {
			super();

			this.endingCharacters = typeof endingCharacters === "string" ? endingCharacters.split(" ") : endingCharacters;
		}

		/**
		 * @override
		 */
		parse(): StateStatus {
			var expressionState: ExpressionState,
				used: UsedInput;

			while (!this.parsingEnded()) {
				if (WordState.ILLEGAL_CHARACTERS.includes(input.current)) {
					this.status = StateStatus.Error;
					input.throw("'" + input.current + "' is an illegal character in word");
				}

				input.advance();
			}

			expressionState = input.space || this.endingCharacters.includes(input.current) ? ExpressionState.Complete : ExpressionState.Unknown;
			used = input.use();

			if (used.range.length == 0) {
				input.throw("unexpected '" + input.current + "'");
			}

			this.expression = new Word(used.value, expressionState, used.range);

			this.status = StateStatus.Done;
			return this.status;
		}

		/**
		 * @override
		 */
		protected parsingEnded(): boolean {
			return super.parsingEnded() || this.endingCharacters.includes(input.current);
		}
	}

	class StringState extends AtomicState<StringParameter> {
		private quoteChar: string;
		private escaped: boolean;

		constructor() {
			super();
			this.escaped = false;
			this.quoteChar = input.current;
		}

		/**
		 * @override
		 */
		parse(): StateStatus {
			var expressionState: ExpressionState,
				used: UsedInput;

			input.advance();

			while (!this.parsingEnded()) {
				if (input.current === "\\") {
					this.escaped = true;
				} else if (this.escaped) {
					this.escaped = false;
				}

				input.advance();
			}

			if (input.current === this.quoteChar && !this.escaped) {
				expressionState = ExpressionState.Complete;
				input.advance();
			} else {
				expressionState = ExpressionState.Incomplete;
			}

			used = input.use()
			this.expression = new StringParameter(used.value, expressionState, used.range);
			this.status = StateStatus.Done;
			return this.status;
		}

		/**
		 * @override
		 */
		protected parsingEnded(): boolean {
			return input.eof || (input.current === this.quoteChar && !this.escaped);
		}
	}

	class CompoundState<T extends Expression<any>> extends ParserState<T> {
		protected innerState: ParserState<any>;

		constructor() {
			super();
			this.innerState = null;
		}

		getInnerState(): ParserState<any> {
			return this.innerState;
		}

		addExpression(expression: Expression<any>): Expression<any> {
			this.innerState = null;
			this.status = StateStatus.Parsing;

			return expression;
		}

		protected parseInnerState(endingCharactersForWord?: string | string[]): void {
			this.status = StateStatus.Pending;

			if (input.current === "'" || input.current === '"') {
				this.innerState = new StringState();
			} else if (input.current === "[") {
				this.innerState = new ListState();
			} else if (input.current === "{") {
				this.innerState = new MapState();
			} else if (input.current === "(") {
				this.innerState = new CommandState();
			} else {
				this.innerState = new WordState(endingCharactersForWord);
			}
		}
	}

	class CommandState extends CompoundState<CommandExpression> {
		private expressions: Expression<any>[];
		private waitForClosingChar: boolean;

		constructor() {
			super();
			this.expressions = [];

			if (input.current === "(") {
				input.advance(true);
				this.waitForClosingChar = true;
			}
		}

		/**
		 * @override
		 */
		parse(): StateStatus {
			input.skipSpaces(true);

			if (this.parsingEnded()) {
				this.handleEnd();
			} else {
				this.parseInnerState(")");
			}

			return this.status;
		}

		/**
		 * @override
		 */
		addExpression(expression: Expression<any>): Expression<any> {
			this.expressions.push(expression);
			return super.addExpression(expression);
		}

		/**
		 * @override
		 */
		protected parsingEnded(): boolean {
			return input.eof || input.current === ")";
		}

		private handleEnd(): void {
			var expressionState: ExpressionState,
				used: UsedInput;

			this.status = StateStatus.Done;
			expressionState = this.expressions.empty() ? ExpressionState.Incomplete : this.expressions.last().state;

			if (input.eof && this.waitForClosingChar) {
				expressionState = ExpressionState.Incomplete;
			} else if (input.current === ")") {
				input.advance();
			}

			used = input.use(this.start);
			this.expression = new CommandExpression(used.value, expressionState, used.range, this.expressions);
		}
	}

	class CompoundParameterState<T extends Parameter<any>> extends CompoundState<T> {
		protected isWordsCollection: boolean;

		/**
		 * @override
		 */
		addExpression(expression: Expression<any>): Expression<any> {
			if (expression instanceof Word) {
				this.isWordsCollection = true;
				expression = CompoundParameterState.wordToParameter(expression as Word)
			}

			return super.addExpression(expression);
		}

		private static wordToParameter(expression: Word): Parameter<any> {
			/*try {
			 return expression.asBooleanParameter();
			 } catch (e) {}

			 try {
			 return expression.asNumberParameter();
			 } catch (e) {}

			 return expression.asStringParameter();*/

			return expression.asParameter();
		}
	}

	class ListState extends CompoundParameterState<ListParameter> {
		private items: Parameter<any>[];
		private expecting: "item | end" | "item" | "comma | end";

		constructor() {
			super();
			this.items = [];
			this.expecting = "item | end";
			input.advance(true); // [
		}

		/**
		 * @override
		 */
		parse(): StateStatus {
			input.skipSpaces(true);

			if (this.parsingEnded()) {
				let expressionState: ExpressionState,
					used: UsedInput;

				this.status = StateStatus.Done;
				if (input.current === "]") {
					input.advance(true);
					expressionState = ExpressionState.Complete;
				} else {
					expressionState = ExpressionState.Incomplete;
				}

				used = input.use(this.start);
				this.expression = this.isWordsCollection ?
					new WordsListParameter(used.value, expressionState, used.range, this.items) :
					new ListParameter(used.value, expressionState, used.range, this.items);
			} else if (this.expecting === "item" || this.expecting === "item | end") {
				this.parseInnerState(", ]");
			} else if (this.expecting === "comma | end") {
				if (input.current !== ",") {
					input.throw("invalid list format, ',' expected");
				}

				input.advance(true);
				this.expecting = "item";
			} else {
				input.throw(`invalid list expecting state: ${ this.expecting }`);
			}

			return this.status;
		}

		/**
		 * @override
		 */
		addExpression(expression: Expression<any>): Expression<any> {
			if (this.expecting !== "item" && this.expecting !== "item | end") {
				input.throw("expression added in the wrong list state");
			}

			this.expecting = "comma | end";

			expression = super.addExpression(expression);
			this.items.push(<Parameter<any>> expression);

			return expression;
		}

		/**
		 * @override
		 */
		protected parsingEnded(): boolean {
			return input.eof || (input.current === "]" && (this.expecting === "comma | end" || this.expecting === "item | end"));
		}
	}

	class MapState extends CompoundParameterState<MapParameter> {
		private map: collections.EntryMap<Parameter<any>, Parameter<any>>;
		private key: Expression<any>;
		private expecting: "key | end" | "key" | "colon" | "value" | "comma | end";

		constructor() {
			super();
			this.key = null;
			this.expecting = "key | end";
			this.map = new collections.EntryMap<Parameter<any>, Parameter<any>>();
			input.advance(true); // {
		}

		/**
		 * @override
		 */
		parse(): StateStatus {
			input.skipSpaces(true);

			if (this.parsingEnded()) {
				let expressionState: ExpressionState,
					used: UsedInput;

				this.status = StateStatus.Done;
				if (input.current === "}") {
					expressionState = ExpressionState.Complete;
					input.advance(true);
				} else {
					expressionState = ExpressionState.Incomplete;
				}

				used = input.use(this.start);
				this.expression = this.isWordsCollection ?
					new WordsMapParameter(used.value, expressionState, used.range, this.map) :
					new MapParameter(used.value, expressionState, used.range, this.map);
			} else if (this.expecting === "key" || this.expecting === "key | end") {
				this.parseInnerState(":");
			} else if (this.expecting === "colon") {
				if (input.current !== ":") {
					this.status = StateStatus.Error;
					input.throw("invalid map format, ':' expected");
				}

				input.advance(true);
				this.expecting = "value";
			} else if (this.expecting === "value") {
				this.parseInnerState(", }");
			} else if (this.expecting === "comma | end") {
				if (input.current === ",") {
					this.expecting = "key";
					input.advance(true);
				} else {
					input.throw("invalid map format, ',' expected");
				}
			} else {
				input.throw(`unknown map expecting state: ${ this.expecting }`);
			}

			return this.status;
		}

		/**
		 * @override
		 */
		addExpression(expression: Expression<any>): Expression<any> {
			expression = super.addExpression(expression);

			if (this.expecting === "key" || this.expecting == "key | end") {
				this.key = expression;
				this.expecting = "colon";
			} else if (this.expecting === "value") {
				this.map.setEntry(<Parameter<any>> this.key, <Parameter<any>> expression);
				this.key = null;
				this.expecting = "comma | end";
			} else {
				input.throw("expression added in the wrong map state");
			}

			return expression;
		}

		/**
		 * @override
		 */
		protected parsingEnded(): boolean {
			return input.eof || (input.current === "}" && (this.expecting === "key | end" || this.expecting === "comma | end"));
		}
	}
}

