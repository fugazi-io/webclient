import * as types from "./types";
import * as coreTypes from "../core/types";
import * as components from "./components";
import * as componentsDescriptor from "./components.descriptor";
import * as componentsBuilder from "./components.builder";
import * as syntax from "./syntax";
import * as descriptor from "./syntax.descriptor";

export function create(rule: string, parent: componentsBuilder.Builder<components.Component>): componentsBuilder.Builder<syntax.SyntaxRule> {
	var anonymousDescriptor: descriptor.Descriptor = <descriptor.Descriptor> componentsBuilder.createAnonymousDescriptor(components.ComponentType.SyntaxRule);
	anonymousDescriptor.rule = rule;

	return new SyntaxRuleBuilder(new componentsDescriptor.ExistingLoader(anonymousDescriptor), parent);
}

interface ParameterData {
	name: string;
	type: string | componentsBuilder.Builder<types.Type>;
}

class SyntaxRuleBuilder extends componentsBuilder.BaseBuilder<syntax.SyntaxRule, descriptor.Descriptor> {
	private parser: {
		rule: string;
		parts: Array<string | ParameterData>;
		index: number;
	};

	constructor(loader: componentsDescriptor.Loader<descriptor.Descriptor>, parent?: componentsBuilder.Builder<components.Component>) {
		super(syntax.SyntaxRule, loader, parent);
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
				if (!coreTypes.is(part, String) && !coreTypes.is((<ParameterData> part).type, String)) {
					(<componentsBuilder.Builder<types.Type>> (<ParameterData> part).type).build().then(this.innerBuilderCompleted.bind(this), this.future.reject);
				}
			});
		}
	}

	protected concreteAssociate(): void {
		(this.component as any).raw = this.componentDescriptor.rule;
		this.parser.parts.forEach(part => {
			if (coreTypes.is(part, String)) {
				(<any> this.component).tokens.push(new syntax.Keyword(<string> part));
			} else if (coreTypes.is((<ParameterData> part).type, String)) {
				let type = this.resolve(components.ComponentType.Type, <string> (<ParameterData> part).type) as types.Type;

				if (type == null) {
					throw new componentsBuilder.Exception(`can not find type "${ <string> (<ParameterData> part).type }"`);
				}

				(<any> this.component).tokens.push(new syntax.Parameter((<ParameterData> part).name, type));
			} else {
				let typeBuilder = (<ParameterData> part).type as componentsBuilder.Builder<types.Type>;
				typeBuilder.associate();

				if (typeBuilder.getComponent() == null) {
					throw new componentsBuilder.Exception(`can not find type "${ typeBuilder.getName() }"`);
				}

				(<any> this.component).tokens.push(new syntax.Parameter((<ParameterData> part).name, typeBuilder.getComponent()));
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
		var endPos: number = this.parser.rule.indexOf(")", this.parser.index);

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
