import * as collections from "../core/types.collections";
import * as inputModule from "./input";

var input: Input,
	stack: StateStack;

export function parse(commandInput: string): inputModule.CommandExpression {
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
	range: inputModule.RangeImpl;
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
		throw new inputModule.ParseException(previous ? this.cursor - 1 : this.cursor, message);
	}

	use(startIndex: number = this.used): UsedInput {
		var usedInput: UsedInput = {
			value: this.substring(startIndex, this.cursor),
			range: new inputModule.RangeImpl(startIndex, this.cursor)
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

class ParserState<T extends inputModule.Expression<any>> {
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

class AtomicState<T extends inputModule.Expression<any>> extends ParserState<T> {
}

class WordState extends AtomicState<inputModule.Word> {
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
		var expressionState: inputModule.ExpressionState,
			used: UsedInput;

		while (!this.parsingEnded()) {
			if (WordState.ILLEGAL_CHARACTERS.includes(input.current)) {
				this.status = StateStatus.Error;
				input.throw("'" + input.current + "' is an illegal character in word");
			}

			input.advance();
		}

		expressionState = input.space || this.endingCharacters.includes(input.current) ? inputModule.ExpressionState.Complete : inputModule.ExpressionState.Unknown;
		used = input.use();

		if (used.range.length == 0) {
			input.throw("unexpected '" + input.current + "'");
		}

		this.expression = new inputModule.Word(used.value, expressionState, used.range);

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

class StringState extends AtomicState<inputModule.StringParameter> {
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
		var expressionState: inputModule.ExpressionState,
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
			expressionState = inputModule.ExpressionState.Complete;
			input.advance();
		} else {
			expressionState = inputModule.ExpressionState.Incomplete;
		}

		used = input.use()
		this.expression = new inputModule.StringParameter(used.value, expressionState, used.range);
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

class CompoundState<T extends inputModule.Expression<any>> extends ParserState<T> {
	protected innerState: ParserState<any>;

	constructor() {
		super();
		this.innerState = null;
	}

	getInnerState(): ParserState<any> {
		return this.innerState;
	}

	addExpression(expression: inputModule.Expression<any>): inputModule.Expression<any> {
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

class CommandState extends CompoundState<inputModule.CommandExpression> {
	private expressions: inputModule.Expression<any>[];
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
	addExpression(expression: inputModule.Expression<any>): inputModule.Expression<any> {
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
		var expressionState: inputModule.ExpressionState,
			used: UsedInput;

		this.status = StateStatus.Done;
		expressionState = this.expressions.empty() ? inputModule.ExpressionState.Incomplete : this.expressions.last().state;

		if (input.eof && this.waitForClosingChar) {
			expressionState = inputModule.ExpressionState.Incomplete;
		} else if (input.current === ")") {
			input.advance();
		}

		used = input.use(this.start);
		this.expression = new inputModule.CommandExpression(used.value, expressionState, used.range, this.expressions);
	}
}

class CompoundParameterState<T extends inputModule.Parameter<any>> extends CompoundState<T> {
	protected isWordsCollection: boolean;

	/**
	 * @override
	 */
	addExpression(expression: inputModule.Expression<any>): inputModule.Expression<any> {
		if (expression instanceof inputModule.Word) {
			this.isWordsCollection = true;
			expression = CompoundParameterState.wordToParameter(expression as inputModule.Word)
		}

		return super.addExpression(expression);
	}

	private static wordToParameter(expression: inputModule.Word): inputModule.Parameter<any> {
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

class ListState extends CompoundParameterState<inputModule.ListParameter> {
	private items: inputModule.Parameter<any>[];
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
			let expressionState: inputModule.ExpressionState,
				used: UsedInput;

			this.status = StateStatus.Done;
			if (input.current === "]") {
				input.advance(true);
				expressionState = inputModule.ExpressionState.Complete;
			} else {
				expressionState = inputModule.ExpressionState.Incomplete;
			}

			used = input.use(this.start);
			this.expression = this.isWordsCollection ?
				new inputModule.WordsListParameter(used.value, expressionState, used.range, this.items) :
				new inputModule.ListParameter(used.value, expressionState, used.range, this.items);
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
	addExpression(expression: inputModule.Expression<any>): inputModule.Expression<any> {
		if (this.expecting !== "item" && this.expecting !== "item | end") {
			input.throw("expression added in the wrong list state");
		}

		this.expecting = "comma | end";

		expression = super.addExpression(expression);
		this.items.push(<inputModule.Parameter<any>> expression);

		return expression;
	}

	/**
	 * @override
	 */
	protected parsingEnded(): boolean {
		return input.eof || (input.current === "]" && (this.expecting === "comma | end" || this.expecting === "item | end"));
	}
}

class MapState extends CompoundParameterState<inputModule.MapParameter> {
	private map: collections.EntryMap<inputModule.Parameter<any>, inputModule.Parameter<any>>;
	private key: inputModule.Expression<any>;
	private expecting: "key | end" | "key" | "colon" | "value" | "comma | end";

	constructor() {
		super();
		this.key = null;
		this.expecting = "key | end";
		this.map = new collections.EntryMap<inputModule.Parameter<any>, inputModule.Parameter<any>>();
		input.advance(true); // {
	}

	/**
	 * @override
	 */
	parse(): StateStatus {
		input.skipSpaces(true);

		if (this.parsingEnded()) {
			let expressionState: inputModule.ExpressionState,
				used: UsedInput;

			this.status = StateStatus.Done;
			if (input.current === "}") {
				expressionState = inputModule.ExpressionState.Complete;
				input.advance(true);
			} else {
				expressionState = inputModule.ExpressionState.Incomplete;
			}

			used = input.use(this.start);
			this.expression = this.isWordsCollection ?
				new inputModule.WordsMapParameter(used.value, expressionState, used.range, this.map) :
				new inputModule.MapParameter(used.value, expressionState, used.range, this.map);
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
	addExpression(expression: inputModule.Expression<any>): inputModule.Expression<any> {
		expression = super.addExpression(expression);

		if (this.expecting === "key" || this.expecting == "key | end") {
			this.key = expression;
			this.expecting = "colon";
		} else if (this.expecting === "value") {
			this.map.setEntry(<inputModule.Parameter<any>> this.key, <inputModule.Parameter<any>> expression);
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


