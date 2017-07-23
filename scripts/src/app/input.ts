import * as coreTypes from "../core/types";
import * as collections from "../core/types.collections";
import * as utils from "../core/utils";

export {parse} from "./input.parser";

export interface Range {
	start: number;
	end: number;
	length: number;
}

export class RangeImpl implements Range {
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

export class MapParameter extends CompoundParameter<collections.EntryMap<Parameter<any>, Parameter<any>>, collections.FugaziMap<any>> {
	public getParameterValues(): collections.FugaziMap<any> {
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
