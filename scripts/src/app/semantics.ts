/// <reference path="../core/logger.ts" />
/// <reference path="../core/types.ts" />

/// <reference path="../components/types.ts" />
/// <reference path="../components/syntax.ts" />
/// <reference path="../components/commands.ts" />
/// <reference path="../components/modules.ts" />
/// <reference path="../components/syntax.ts" />

/// <reference path="input.ts" />
/// <reference path="statements.ts" />

"use strict";

module fugazi.app.semantics {
	type ConverterFunction = (word: input.Word) => input.Expression<any>;

	let CONVERTERS: ConverterFunction[] = [
		word => word.asKeyword(),
		word => word.asNumberParameter(),
		word => word.asBooleanParameter(),
		word => word.asStringParameter()
	];

	interface Forest {
		roots: TokenGraphNode[],
	}

	let forest: Forest = {
		roots: [],
	};


	export interface MatchResult {
		command: components.commands.Command;
		rule: components.commands.syntax.SyntaxRule;
	}

	export class PossibleInterpretation {
		private matchScore: number;
		private matchResult: MatchResult;
		private isFullMatch: boolean;
		private interpretedExpression: input.Expression<any>[];
		private interpretedCommandExpression: input.CommandExpression;

		constructor(score:  number, match: MatchResult, interpretedExpression: input.Expression<any>[], isFullMatch: boolean) {
			this.matchScore = score;
			this.matchResult = match;
			this.isFullMatch = isFullMatch;
			this.interpretedExpression = interpretedExpression;
		}

		public get score(): number {
			// TODO: naive implementation
			return this.matchScore;
		}
		
		public get executable(): boolean {
			if (this.isFullMatch) {
				let perfectScore: number = Math.pow(semantics.Scoreboard.perfectScore(), this.interpretedExpression.length);

				return this.score / perfectScore == semantics.Scoreboard.unknownStateScore() ||
					this.score / perfectScore == semantics.Scoreboard.perfectScore();

			} else {
				return false;
			}
		}

		public get match(): MatchResult {
			return this.matchResult;
		}

		public get interpretedCommand(): input.CommandExpression {
			return this.interpretedCommandExpression;
		}

		public set interpretedCommand(baseCommand: input.CommandExpression) {
			this.interpretedCommandExpression = new input.CommandExpression(baseCommand.input, baseCommand.state,
				baseCommand.range, this.interpretedExpression);
		}
	}

	export class Scoreboard {
		private static svc = {
			VVV: 9,
			VVU: 8,
			VVX: 7,
			VXV: 6,
			VXU: 5,
			VXX: 4,
			XXV: 3,
			XXU: 2,
			XXX: 1,
		};

		public static score(satisfied: boolean, valid: boolean, complete: input.ExpressionState) : number {
			var str = satisfied ? "V" : "X";
			str += valid ? "V" : "X";
			str += complete === input.ExpressionState.Complete ? "V" : complete === input.ExpressionState.Incomplete ? "X" : "U";

			return this.svc[str];
		}

		public static perfectScore(): number {
			return Scoreboard.svc["VVV"];
		}

		public static unknownStateScore(): number {
			return Scoreboard.svc["VVU"];
		}

		public static toleranceScore(): number {
			return Scoreboard.svc["VXU"];
		}
	}

	class TokenGraphNode {
		token: components.commands.syntax.RuleToken;
		transitions: TokenGraphNode[];
		commands: MatchResult[];

		public constructor(token: components.commands.syntax.RuleToken) {
			this.token = token;
			this.transitions = [];
			this.commands = [];
		}

		public transitOverToken(transitionToken: components.commands.syntax.RuleToken): TokenGraphNode {
			for (var i = 0; i < this.transitions.length; i++) {
				if (this.transitions[i].token.equals(transitionToken)) {
					return this.transitions[i];
				}
			}

			return null;
		}

		public fuzzyMatch(currentExpressions: input.Expression<any>[],
		                  currentInterpretation: input.Expression<any>[],
		                  result: PossibleInterpretation[],
		                  currentInterpretationScore: number): void {

			if (!currentExpressions.empty()) {
				let firstExpression: input.Expression<any> = currentExpressions.first(),
					collector = this.collectMatches.bind(this, currentExpressions.slice(1), result);

				if (firstExpression instanceof input.Parameter) {
					collector(firstExpression, currentInterpretation, currentInterpretationScore);

				} else if (firstExpression instanceof input.Word) {
					CONVERTERS.some(converter => {
						try {
							let convertedExpression = converter(firstExpression as input.Word);
							if (this.getScore(convertedExpression) === 0) {
								return false;

							} else {
								collector(convertedExpression,
									currentInterpretation,
									currentInterpretationScore);
								return true;
							}

						} catch (e) {
							return false;
						}
					});

				} else {
					throw new Exception("can only deal with Word or Parameter");
				}
			}
		}

		private getScore(expression: input.Expression<any>): number {
			if ((this.token.getTokenType() === components.commands.syntax.TokenType.Keyword) && expression instanceof input.Keyword ||
				(this.token.getTokenType() === components.commands.syntax.TokenType.Parameter) && (expression instanceof input.Parameter)) {
				return Scoreboard.score(
					this.token.tolerates(expression.value),
					this.token.validates(expression.value),
					expression.state);
            // KW <-> Parameter is forbidden, thus score is 0
			} else {
				return 0;
			}
		}

		private collectMatches(tailExpressions: input.Expression<any>[], result: PossibleInterpretation[],
		                       expression: input.Expression<any>, interpretationExpression: input.Expression<any>[],
			                   currentInterpretationScore: number): void {
			if (this.shouldCollect(currentInterpretationScore)) {
				let score = this.getScore(expression);

				if (this.shouldCollect(score)) {
					var interpretationScore = score * currentInterpretationScore;

					interpretationExpression = interpretationExpression.clone();
					interpretationExpression.push(expression);

					this.commands.forEach((matchResult:MatchResult) => {
						let interpretation = new PossibleInterpretation(interpretationScore, matchResult, interpretationExpression, tailExpressions.empty());
						result.push(interpretation);
					});

					if (!tailExpressions.empty()) {
						this.transitions.forEach(function (transition:TokenGraphNode):void {
							transition.fuzzyMatch(tailExpressions, interpretationExpression, result, interpretationScore);
						});
					} else {
						this.transitions.forEach(function (transition:TokenGraphNode):void {
							transition.collectAll(interpretationScore, interpretationExpression, result);
						});
					}
				}
			}
		}

		private shouldCollect(score: number): boolean {
			return score >= Scoreboard.toleranceScore();
		}

		private collectAll(score: number, interpretationExpression: input.Expression<any>[], result: PossibleInterpretation[]): void {
			this.commands.forEach((matchResult:MatchResult) => {
				let interpretation = new PossibleInterpretation(score, matchResult, interpretationExpression, false);
				result.push(interpretation);
			});

			this.transitions.forEach(function (transition:TokenGraphNode):void {
				transition.collectAll(score, interpretationExpression, result);
			});
		}
	}


	// TODO: FOR DEBUGGING PURPOSES
	export function instance(): any {
		return forest;
	}

	export function interpret(commandExpression: input.CommandExpression): PossibleInterpretation[] {
		let result: PossibleInterpretation[] = [];

		forest.roots.forEach(root => root.fuzzyMatch(commandExpression.getExpressions(), [], result, Scoreboard.perfectScore()));
		result.forEach(interpretation => interpretation.interpretedCommand = commandExpression);
		result = result.sort((item1, item2) =>  item2.score - item1.score);

		return result;
	}

	export function match(commandExpression: input.CommandExpression): PossibleInterpretation[] {
		return interpret(commandExpression).filter( (ce) => ce.executable );
	}

	export function update(theModule: components.modules.Module): void {
		theModule.forEachCommand(updateCommand);
		theModule.forEachModule(childModule => update(childModule));
	}

	function updateCommand(command: components.commands.Command): void {
		let rules: components.commands.syntax.SyntaxRule[] = command.getSyntax();
		for (var i: number = 0; i < rules.length; i++) {
			updateSyntaxRule(command, rules[i]);
		}
	}

	function updateSyntaxRule(command: components.commands.Command, rule: components.commands.syntax.SyntaxRule) : void {
		let currentTokenNode: TokenGraphNode,
			tokens = rule.getTokens().clone(),
			possibleRootNodes = forest.roots.filter(root => root.token.equals(tokens.first()));

		if (possibleRootNodes.length > 0) {
			currentTokenNode = possibleRootNodes[0];
			tokens.remove(0);
		} else {
			currentTokenNode = new TokenGraphNode(tokens.remove(0));
			forest.roots.push(currentTokenNode);
		}

		tokens.forEach(token => {
			let nextPossibleTransition: TokenGraphNode = currentTokenNode.transitOverToken(token);

			if (nextPossibleTransition) {
				currentTokenNode = nextPossibleTransition;
			} else {
				let newTokenNode:TokenGraphNode = new TokenGraphNode(token);
				currentTokenNode.transitions.push(newTokenNode);
				currentTokenNode = newTokenNode;
			}
		});

		currentTokenNode.commands.push({ command: command, rule: <components.commands.syntax.SyntaxRule> rule });
	}
}
