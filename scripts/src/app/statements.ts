/// <reference path="input.ts" />
/// <reference path="terminal.ts" />
/// <reference path="semantics.ts" />
/// <reference path="../components/types.ts" />
/// <reference path="../components/syntax.ts" />

module fugazi.app.statements {
	export enum StatementPartRole {
		Keyword,
		Parameter
	}

	export class StatementException extends fugazi.Exception {}

	export class InvalidStatementException extends StatementException {
		private invalidParts: StatementPart<any>[];

		constructor(invalidParts: StatementPart<any>[]) {
			super("The Statement is invalid");
			this.invalidParts = invalidParts;
		}

		public getInvalidParts(): StatementPart<any>[] {
			return this.invalidParts;
		}
	}

	export class StatementPart<T extends components.commands.syntax.RuleToken> {
		protected role: StatementPartRole;
		protected expression: input.Expression<any>;
		protected ruleToken: T;

		public constructor(role: StatementPartRole, expression: input.Expression<any>, ruleToken: T) {
			this.role = role;
			this.expression = expression;
			this.ruleToken = ruleToken;
		}
	}

	export class ParameterPart extends StatementPart<components.commands.syntax.Parameter> {
		public getName(): string {
			return this.ruleToken.getName();
		}

		public getValue(): any {
			if (this.expression instanceof input.CompoundParameter) {
				return (<input.CompoundParameter<any, any>> this.expression).getParameterValues();
			}

			return this.expression.value;
		}

		public getType(): components.types.Type {
			return this.ruleToken.getType();
		}

		public getExpression(): input.Expression<any> {
			return this.expression;
		}

		public validate(): boolean {
			return this.ruleToken.getType().validate(this.getValue());
		}
	}

	export class InnerStatementPart extends ParameterPart {

	}

	export abstract class Statement {
		protected parts: StatementPart<components.commands.syntax.RuleToken>[];
		protected rule: components.commands.syntax.SyntaxRule;
		protected command: components.commands.Command;
		protected expression: input.CommandExpression;
		protected context: terminal.ContextProvider;
		protected error: StatementException;
		protected params: ParameterPart[];

		public constructor(context: terminal.ContextProvider, command: components.commands.Command, rule: components.commands.syntax.SyntaxRule, expression: input.CommandExpression) {
			this.expression = expression;
			this.context = context;
			this.command = command;
			this.error = null;
			this.rule = rule;
			this.parts = [];
			this.params = [];
		}

		public getCommand(): components.commands.Command {
			return this.command;
		}

		public getReturnType(): components.types.Type {
			return this.getCommand().getReturnType();
		}

		public getRule(): components.commands.syntax.SyntaxRule {
			return this.rule;
		}

		public getExpression(): input.CommandExpression {
			return this.expression;
		}

		public abstract execute(): components.commands.ExecutionResult;

		public isValid(): boolean {
			return this.expression.state !== input.ExpressionState.Incomplete;
		}

		protected processParts(): void {
			var inputExpressions: input.Expression<any>[] = this.expression.getExpressions(),
				ruleTokens: components.commands.syntax.RuleToken[] = this.rule.getTokens();

			if (inputExpressions.length !== ruleTokens.length) {
				this.error = new StatementException("mismatch between input expressions and syntax rule");
				return;
			}

			for (var i = 0; i < inputExpressions.length; i++) {
				this.createPart(ruleTokens[i], inputExpressions[i]);
			}
		}

		protected getModuleContext(): modules.ModuleContext {
			const path = this.command.getParent().getPath();

			if (this.command.isRestricted()) {
				return this.context.module.restricted(path);
			} else {
				return this.context.module.privileged(path);
			}
		}

		protected createPart(ruleToken: components.commands.syntax.RuleToken, expression: input.Expression<any>): void {
			let part: StatementPart<components.commands.syntax.RuleToken>;

			switch (ruleToken.getTokenType()) {
				case components.commands.syntax.TokenType.Keyword:
					part = new StatementPart(StatementPartRole.Keyword, expression, ruleToken);
					break;

				case components.commands.syntax.TokenType.Parameter:
					part = new ParameterPart(StatementPartRole.Parameter, expression, <components.commands.syntax.Parameter> ruleToken);
					this.params.push(part as ParameterPart);
					break;
			}

			this.parts.push(part);
		}
	}

	class AtomicStatement extends Statement {
		public execute(): components.commands.ExecutionResult {
			this.processParts();

			let invalidParameters: ParameterPart[] = [],
				commandParams: components.commands.ExecutionParameters = new components.commands.ExecutionParameters();

			for (var i = 0; i < this.params.length; i++) {
				let parameterPart: ParameterPart = this.params[i];

				if (parameterPart.validate()) {
					commandParams.add(parameterPart.getName(), parameterPart.getValue());
				} else {
					invalidParameters.push(parameterPart);
				}
			}

			if (!invalidParameters.empty()) {
				throw new InvalidStatementException(invalidParameters);
			}

			return this.command.executeNow(this.getModuleContext(), commandParams);
		}
	}

	class CompoundStatement extends Statement {
		private executableStatements: Statement[];

		public constructor(context: terminal.ContextProvider, command: components.commands.Command,
		                   rule: components.commands.syntax.SyntaxRule, expression: input.CommandExpression, executableStatements: Statement[]) {
			super(context, command, rule, expression);
			this.executableStatements = executableStatements;
		}

		public execute(): components.commands.ExecutionResult {
			let executer = this.command.executeLater(this.getModuleContext()),
				commandParams: components.commands.ExecutionParameters = new components.commands.ExecutionParameters();

			this.processParts();

			this.executeAll(this.params, this.executableStatements, commandParams, executer);

			return executer.result;
		}

		private executeAll(params: ParameterPart[], executableStatements: Statement[],
		                   commandParams: components.commands.ExecutionParameters, executer: components.commands.Executer): void {
			if (params.empty()) {
				executer.execute(commandParams).then(executer.result.resolve.bind(executer.result)).catch(executer.result.reject.bind(executer.result));

			} else {
				let parameterPart = params[0];

				if (this.requireStatementExecution(parameterPart)) {
					if (executableStatements.empty()) {
						executer.result.reject(new InvalidStatementException([parameterPart]));
					} else {
						executableStatements[0].execute().then(value => {
							if (parameterPart.getType().validate(value)) {
								commandParams.add(parameterPart.getName(), value);
								this.executeAll(params.slice(1), executableStatements.slice(1), commandParams, executer);
							} else {
								executer.result.reject(new InvalidStatementException([parameterPart]));
							}
						}).catch(executer.result.reject.bind(executer.result));
					}
				} else if (parameterPart.validate()) {
					commandParams.add(parameterPart.getName(), parameterPart.getValue());
					this.executeAll(params.slice(1), executableStatements, commandParams, executer);
				} else {
					executer.result.reject(new InvalidStatementException([parameterPart]));
				}
			}
		}

		protected createPart(ruleToken: components.commands.syntax.RuleToken, expression: input.Expression<any>): void {
			if (expression instanceof InnerCommandExpression) {
				let part = new InnerStatementPart(StatementPartRole.Parameter, expression, <components.commands.syntax.Parameter> ruleToken);
				this.params.push(part);
				this.parts.push(part);
			} else {
				super.createPart(ruleToken, expression);
			}
		}

		private requireStatementExecution(parameterPart: ParameterPart): boolean {
			return parameterPart instanceof InnerStatementPart;
		}

		private matchPartToStatement(statement: Statement, parameterPart: ParameterPart): boolean {
			return statement.getExpression().input === parameterPart.getExpression().input;
		}
	}

	export interface StatementSession {
		getSuggestions(currentPosition: number): Statement[];
		getExecutable(): Statement;
	}

	class StatementSessionImpl implements StatementSession {
		private rawInput: string;
		private context: terminal.ContextProvider;

		constructor(rawInput: string, context: terminal.ContextProvider) {
			this.rawInput = rawInput;
			this.context = context;
		}

		public getSuggestions(currentPosition: number): Statement[] {
			if (currentPosition < 0 || currentPosition > this.rawInput.length) {
				return [];
			}

			let relevantExpression: input.CommandExpression = this.findCommandRelevantForSuggestions(input.parse(this.rawInput), currentPosition),
				innerStatements: Statement[] =
					relevantExpression.getExpressions()
						.filter(exp => exp instanceof input.CommandExpression)
						.map(cmd => this.createExecutable(<input.CommandExpression>cmd)),
				commandExpression: input.CommandExpression = this.prepareCommand(relevantExpression, innerStatements),
				suggestions: Statement[] = semantics.interpret(commandExpression)
					.map(interpretation => new AtomicStatement(this.context, interpretation.match.command,
						interpretation.match.rule, interpretation.interpretedCommand));

			return suggestions;
		}

		public getExecutable(): Statement {
			let commandExpression: input.CommandExpression = input.parse(this.rawInput);
			return this.createExecutable(commandExpression);
		}

		private createExecutable(commandExpression: input.CommandExpression): Statement {
			if (commandExpression.getExpressions().some(exp => exp instanceof input.CommandExpression)) {
				return this.createCompoundExecutable(commandExpression);

			} else {
				return this.createAtomicExecutable(commandExpression);
			}
		}

		private createCompoundExecutable(commandExpression: input.CommandExpression): CompoundStatement {
			let commandExpressions: input.CommandExpression[] =
				<input.CommandExpression[]> commandExpression.getExpressions().filter(exp => exp instanceof input.CommandExpression);

			if (!commandExpressions.empty()) {
				const executableStatements: Statement[] = commandExpressions.map(executableExpression => {
						let executable = this.createExecutable(executableExpression);
						if (executable === null) {
							throw new Exception(`The statement "${executableExpression.input}" cannot be interpreted`);
						}

						return executable;
					}),
					preparedCommandExpression: input.CommandExpression = this.prepareCommand(commandExpression, executableStatements),
					matches = semantics.match(preparedCommandExpression);

				if (!matches.empty()) {
					const firstMatch = matches.first();
					return new CompoundStatement(this.context,firstMatch.match.command,
						firstMatch.match.rule, firstMatch.interpretedCommand, executableStatements);
				}
			}

			return null;
		}

		private createAtomicExecutable(commandExpression: input.CommandExpression): AtomicStatement {
			let preparedCommandExpression: input.CommandExpression = this.prepareCommand(commandExpression, []),
				matches: semantics.PossibleInterpretation[] = semantics.match(preparedCommandExpression);

			if (!matches.empty()) {
				let firstMatch = matches.first();
				return new AtomicStatement(this.context, firstMatch.match.command, firstMatch.match.rule, firstMatch.interpretedCommand);

			} else {
				return null;
			}
		}

		private prepareCommand(commandExpression: input.CommandExpression, innerStatements: Statement[]): input.CommandExpression {
			let newExpressions: input.Expression<any>[] = [],
				originalExpressions = commandExpression.getExpressions(),
				matchedReturnTypesCount = 0;

			originalExpressions.forEach((expression, index) => {
				if (expression instanceof input.Word && this.context.terminal().isVariableReference(expression.value)) {
					if (!this.context.terminal().hasVariable(expression.value)) {
						if (index === originalExpressions.length - 1) {
							return;
						}
						throw new Exception(`can not find variable "${ expression.value }"`);
					}

					newExpressions.push(new VariableExpression(expression, this.context.terminal().retrieveVariable(expression.value)));
				} else if (expression instanceof input.CommandExpression) {
					if (matchedReturnTypesCount >= innerStatements.length) {
						throw new Exception(`Could not find return type of expression "${ expression.input }"`);
					}

					newExpressions.push(new InnerCommandExpression(expression, innerStatements[matchedReturnTypesCount++].getReturnType()));
				} else {
					newExpressions.push(expression);
				}
			});

			return new input.CommandExpression(commandExpression.input, commandExpression.state, commandExpression.range, newExpressions);
		}

		private findCommandRelevantForSuggestions(commandExpression: input.CommandExpression, lookedupPosition: number): input.CommandExpression {
			let candidate: input.CommandExpression = null;

			if (lookedupPosition >= commandExpression.range.start && commandExpression.range.end >= lookedupPosition) {
				candidate = commandExpression;

				let innerExpressions: input.CommandExpression[] =
					<input.CommandExpression[]> commandExpression.getExpressions().
					filter(exp => exp instanceof input.CommandExpression && lookedupPosition >= exp.range.start && exp.range.end >= lookedupPosition);
				if (!innerExpressions.empty()) {
					candidate = this.findCommandRelevantForSuggestions(innerExpressions.last(), lookedupPosition) || candidate;
				}
			}

			return candidate;
		}
	}

	export function createStatementsSession(rawInput: string, context: terminal.ContextProvider): StatementSession {
		return new StatementSessionImpl(rawInput, context);
	}

	class VariableExpression extends input.Parameter<any> {
		private original: input.Expression<any>;
		private variable: Variable;

		constructor(original: input.Expression<any>, variable: Variable) {
			super(original.input, input.ExpressionState.Complete, original.range, original.value);

			this.original = original;
			this.variable = variable;
		}

		get value(): any {
			return this.variable.value;
		}

		get type(): components.types.Type {
			return this.variable.type;
		}
	}

	class InnerCommandExpression extends input.Parameter<any> {
		private returnType: components.types.Type;

		constructor (original: input.CommandExpression, returnType: components.types.Type) {
			super(original.input, input.ExpressionState.Complete, original.range, null);
			this.returnType = returnType;
		}

		get value(): any {
			return this.returnType;
		}

		get type(): components.types.Type {
			return this.returnType;
		}
	}

}