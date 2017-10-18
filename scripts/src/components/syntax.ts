import * as types from "./types";
import * as coreTypes from "../core/types";
import * as components from "./components";

export enum TokenType {
	Keyword,
	Parameter
}

export interface RuleToken {
	tolerates(input: any): boolean;
	validates(input: any): boolean;
	getTokenType(): TokenType;
	equals(otherToken: RuleToken): boolean;
	toString(): string;
}

export class SyntaxRule extends components.Component {
	public readonly raw;
	private tokens: RuleToken[];

	public constructor() {
		super(components.ComponentType.SyntaxRule);

		this.tokens = [];
	}

	public add(token: RuleToken): void {
		this.tokens.push(token);
	}

	public getTokens(): RuleToken[] {
		return this.tokens.clone();
	}

	public toString(): string {
		return this.tokens.map(token => token.toString()).join(" ");
	}
}

export class Keyword implements RuleToken {
	private value: string;
	private distanceCache: Map<string, number>;

	public constructor(word: string) {
		if (word.test(/^[0-9]|[\"'\(\)\[\]\{\},:]/)) {
			throw new coreTypes.Exception("illegal keyword: " + word);
		}

		this.value = word;
		this.distanceCache = new Map<string, number>();
	}

	public tolerates(input: string): boolean {
		if (this.value.startsWith(input)) {
			return true;

		} else {
			let distance = this.computeDistance(input, this.value);

			return distance / this.value.length < 0.5;
		}
	}

	public validates(input: string): boolean {
		return this.value === input;
	}

	public getTokenType(): TokenType {
		return TokenType.Keyword;
	}

	public getWord(): string {
		return this.value;
	}

	public equals(other: RuleToken): boolean {
		return coreTypes.is(other, Keyword) && this.value === (<Keyword>other).value;
	}

	public toString(): string {
		return "[Keyword|" + this.value + "]";
	}

	private computeDistance(challenge: string, target: string): number {
		let key = `${challenge}:${target}]`;
		if (this.distanceCache.has(key)) {
			return this.distanceCache.get(key);
		}

		let distance = 0;
		if (challenge.empty() || target.empty()) { // do not charge for tail typos
			distance = Math.abs(challenge.length - target.length);

		} else if (challenge.charAt(0) === target.charAt(0)) { // keep with 0 charge
			distance = this.computeDistance(challenge.substring(1), target.substring(1));

		} else {
			distance = 1 + Math.min( // charge all actions with 1
					this.computeDistance(challenge.substring(1), target.substring(1)), // case wrong char
					this.computeDistance(target.charAt(0) + challenge, target), // case missing char
					this.computeDistance(challenge.substring(1), target) // case added char
				);
		}

		this.distanceCache.set(key, distance);

		return distance;
	}
}

export class Parameter implements RuleToken {
	private name: string;
	private type: types.Type;

	public constructor(name: string, type: types.Type) {
		this.name = name;
		this.type = type;
	}

	public getName(): string {
		return this.name;
	}

	public getType(): types.Type {
		return this.type;
	}

	public tolerates(input: string | types.Type): boolean {
		return isType(input) ? this.checkType(input) : this.type.satisfies(input);
	}

	public validates(input: string | types.Type): boolean {
		return isType(input) ? this.checkType(input) : this.type.validate(input);
	}

	public getTokenType(): TokenType {
		return TokenType.Parameter;
	}

	public equals(other: RuleToken): boolean {
		return coreTypes.is(other, Parameter) && this.type === (<Parameter>other).type;
	}

	public toString(): string {
		return "[Parameter|" + this.type.toString() + "]";
	}

	private checkType(type: types.Type): boolean {
		// used to be:
		// return this.type.is(type)
		// now:
		return type.is(this.type);
	}
}

function isType(input: any): input is types.Type {
	return coreTypes.is(input.satisfies, Function);
}