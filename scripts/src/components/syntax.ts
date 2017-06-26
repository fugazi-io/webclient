/// <reference path="components.ts" />
/// <reference path="types.ts" />

"use strict";

module fugazi.components.commands.syntax {
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
			super(ComponentType.SyntaxRule);

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
	
	export class Keyword implements RuleToken  {
		private value: string;
		private distanceCache: Map<string, number>;

		public constructor(word: string) {
			if (word.test(/^[0-9]|[\"'\(\)\[\]\{\},:]/)) {
				throw new fugazi.Exception("illegal keyword: " + word);
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
			return fugazi.is(other, Keyword) && this.value === (<Keyword>other).value;
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
			return fugazi.is(other, Parameter) && this.type === (<Parameter>other).type;
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
	
	export namespace descriptor {
		export interface Descriptor extends components.descriptor.Descriptor {
			rule: string;
		}
	}

	function isType(input: any): input is types.Type {
		return fugazi.is(input.satisfies, Function);
	}

	export namespace builder {
		export function create(rule: string, parent: components.builder.Builder<components.Component>): components.builder.Builder<SyntaxRule> {
			var anonymousDescriptor: descriptor.Descriptor = <descriptor.Descriptor> components.builder.createAnonymousDescriptor(ComponentType.SyntaxRule);
			anonymousDescriptor.rule = rule;

			return new SyntaxRuleBuilder(new components.descriptor.ExistingLoader(anonymousDescriptor), parent);
		}

		interface ParameterData {
			name: string;
			type: string | components.builder.Builder<types.Type>;
		}
		
		class SyntaxRuleBuilder extends components.builder.BaseBuilder<SyntaxRule, descriptor.Descriptor> {
			private parser: {
					rule: string;
					parts: Array<string | ParameterData>;
					index: number;
				};

			constructor(loader: components.descriptor.Loader<descriptor.Descriptor>, parent?: components.builder.Builder<Component>) {
				super(SyntaxRule, loader, parent);
			}

			protected onDescriptorReady(): void {
				this.parser = {
					rule: this.componentDescriptor.rule,
					parts: [],
					index: 0
				}

				this.parse();
			}

			protected concreteBuild(): void {
				if (!this.hasInnerBuilders()) {
					this.future.resolve(this.component);
				} else {
					this.parser.parts.forEach(part => {
						if (!fugazi.is(part, String) && !fugazi.is((<ParameterData> part).type, String)) {
							(<components.builder.Builder<types.Type>> (<ParameterData> part).type).build().then(this.innerBuilderCompleted.bind(this), this.future.reject);
						}
					});
				}
			}

			protected concreteAssociate(): void {
				(this.component as any).raw = this.componentDescriptor.rule;
				this.parser.parts.forEach(part => {
					if (fugazi.is(part, String)) {
						(<any> this.component).tokens.push(new Keyword(<string> part));
					} else if (fugazi.is((<ParameterData> part).type, String)) {
						let type = this.resolve(ComponentType.Type, <string> (<ParameterData> part).type) as types.Type;

						if (type == null) {
							throw new components.builder.Exception(`can not find type "${ <string> (<ParameterData> part).type }"`);
						}

						(<any> this.component).tokens.push(new Parameter((<ParameterData> part).name, type));
					} else {
						let typeBuilder = (<ParameterData> part).type as components.builder.Builder<types.Type>;
						typeBuilder.associate();

						if (typeBuilder.getComponent() == null) {
							throw new components.builder.Exception(`can not find type "${ typeBuilder.getName() }"`);
						}

						(<any> this.component).tokens.push(new Parameter((<ParameterData> part).name, typeBuilder.getComponent()));
					}
				});
			}

			private parse(): void {
				while (this.parser.index < this.parser.rule.length) {
					this.skipSpaces();

					if (this.parser.rule[this.parser.index] == "(") {
						this.parseParameter();
					} else {
						this.parseKeyword();
					}
				}
			}

			private skipSpaces(): void {
				while (this.parser.rule[this.parser.index] == " ") {
					this.parser.index++;
				}
			}

			private parseParameter(): void {
				var name: string;
				var type: string;
				var anonymous: boolean;
				var endPos: number =  this.parser.rule.indexOf(")", this.parser.index);

				this.parser.index++; // (
				name = this.parseWord();
				this.skipSpaces();
				type = this.parser.rule.substring(this.parser.index, endPos);
				this.parser.index = endPos + 1;

				anonymous = types.descriptor.isAnonymousDefinition(<types.TextualDefinition> type);
				if (anonymous) {
					this.innerBuilderCreated();
				}

				this.parser.parts.push({
					name: name,
					type: anonymous ? types.builder.create(<string> type, this) : type
				});
			}

			private parseKeyword(): void {
				this.parser.parts.push(this.parseWord());
			}

			private parseWord(): string {
				var end: number = this.parser.rule.indexOf(" ", this.parser.index),
					word: string;

				if (end < 0) {
					end = this.parser.rule.length;
				}

				word = this.parser.rule.substring(this.parser.index, end);
				this.parser.index = end;
				return word;
			}
		}
	}
}
