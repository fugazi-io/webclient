import * as coreTypes from "../core/types";
import * as net from "../core/net";
import * as modules from "./modules";
import * as components from "./components";
import * as componentsBuilder from "./components.builder";
import * as componentsDescriptor from "./components.descriptor";
import * as typesDescriptor from "./types.descriptor";
import * as typesBuilder from "./types.builder";
import * as types from "./types";
import * as syntax from "./syntax";
import * as converters from "./converters";
import * as syntaxBuilder from "./syntax.builder";
import * as commands from "./commands";
import * as descriptor from "./commands.descriptor";
import * as handler from "./commands.handler";

export function create(commandDescriptor: descriptor.Descriptor, parent: componentsBuilder.Builder<components.Component>): componentsBuilder.Builder<commands.Command>;
export function create<T extends commands.LocalCommand>(commandDescriptor: descriptor.Descriptor, parent: componentsBuilder.Builder<components.Component>, ctor: { new (): T }): componentsBuilder.Builder<commands.Command>;
export function create(commandDescriptor: descriptor.Descriptor, parent: componentsBuilder.Builder<components.Component>, ctor?: any): componentsBuilder.Builder<commands.Command> {
	let loader = new componentsDescriptor.ExistingLoader(<descriptor.LocalCommandDescriptor> commandDescriptor);

	if (coreTypes.is((<descriptor.LocalCommandDescriptor> commandDescriptor).handler, Function)) {
		return new LocalCommandBuilder(loader, parent);
	}

	if (coreTypes.isPlainObject((<descriptor.RemoteCommandDescriptor> commandDescriptor).handler)) {
		return new RemoteCommandBuilder(loader, parent);
	}

	throw new componentsBuilder.Exception("invalid command descriptor");
}

class CommandBuilder<T extends commands.Command> extends componentsBuilder.BaseBuilder<T, descriptor.Descriptor> {
	private returnType: types.TextualDefinition | componentsBuilder.Builder<types.Type>;
	private syntaxBuilders: componentsBuilder.Builder<syntax.SyntaxRule>[];

	protected onDescriptorReady(): void {
		this.syntaxBuilders = [];

		if (this.componentDescriptor.returns != null
			&& (typeof this.componentDescriptor.returns === "string" && typesDescriptor.isAnonymousDefinition(this.componentDescriptor.returns))
			|| coreTypes.isPlainObject(this.componentDescriptor.returns)) {
			this.returnType = typesBuilder.create(<string> this.componentDescriptor.returns, this);
			this.innerBuilderCreated();
		} else {
			this.returnType = this.componentDescriptor.returns as string || "void";
		}

		if (typeof this.componentDescriptor.syntax === "string") {
			this.componentDescriptor.syntax = [this.componentDescriptor.syntax];
		}

		this.componentDescriptor.syntax.forEach(syntaxString => {
			this.innerBuilderCreated();
			return this.syntaxBuilders.push(syntaxBuilder.create(syntaxString, this))
		});
	}

	protected concreteBuild(): void {
		let component: any = (<any> this.component);

		component.asynced = this.componentDescriptor.async || false;
		this.syntaxBuilders.forEach(syntaxBuilder => syntaxBuilder.build().then(this.innerBuilderCompleted.bind(this), this.future.reject));

		if (coreTypes.is(this.returnType, componentsBuilder.BaseBuilder)) {
			(<componentsBuilder.Builder<types.Type>> this.returnType).build().then(this.innerBuilderCompleted.bind(this), this.future.reject);
		}
	}

	protected concreteAssociate(): void {
		var component: any = (<any> this.component);

		if (coreTypes.is(this.returnType, componentsBuilder.BaseBuilder)) {
			(<componentsBuilder.Builder<types.Type>> this.returnType).associate();
			component.returnType = (<componentsBuilder.Builder<types.Type>> this.returnType).getComponent();
		} else { // types.TextualDefinition AKA string
			component.returnType = this.resolve<types.Type>(components.ComponentType.Type, <string> this.returnType);
		}

		if (this.componentDescriptor.convert) {
			component.convert = {
				from: this.resolve<types.Type>(components.ComponentType.Type, this.componentDescriptor.convert.from)
			}

			if (this.componentDescriptor.convert.converter) {
				component.convert.converter = this.resolve<converters.Converter>(components.ComponentType.Converter, this.componentDescriptor.convert.converter);
			}
		}

		this.syntaxBuilders.forEach(syntaxBuilder => {
			syntaxBuilder.associate();
			component.syntax.push(syntaxBuilder.getComponent());
		});
	}
}

function getPassedParametersForm(str: string): handler.PassedParametersForm {
	if (str === "list") {
		return handler.PassedParametersForm.List;
	}

	if (str === "struct") {
		return handler.PassedParametersForm.Struct;
	}

	if (str === "map") {
		return handler.PassedParametersForm.Map;
	}

	return handler.PassedParametersForm.Arguments;
}

class LocalCommandBuilder extends CommandBuilder<commands.LocalCommand> {
	constructor(loader: componentsDescriptor.Loader<descriptor.Descriptor>, parent?: componentsBuilder.Builder<components.Component>, ctor?: { new (): commands.LocalCommand }) {
		super(ctor || commands.LocalCommand, loader, parent);
	}

	protected concreteBuild(): void {
		var component: any;

		super.concreteBuild();

		component = (<any> this.component);

		if (component.async) {
			component.handler = (<descriptor.LocalCommandDescriptor> this.componentDescriptor).handler;
		} else {
			component.handler = commands.wrapSyncedHandler.bind(null, (<descriptor.LocalCommandDescriptor> this.componentDescriptor).handler);
		}

		component.parametersForm = getPassedParametersForm((<descriptor.LocalCommandDescriptor> this.componentDescriptor).parametersForm);
	}
}

class RemoteCommandBuilder extends CommandBuilder<commands.RemoteCommand> {
	constructor(loader: componentsDescriptor.Loader<descriptor.Descriptor>, parent?: componentsBuilder.Builder<components.Component>) {
		super(commands.RemoteCommand, loader, parent);
	}

	protected concreteAssociate(): void {
		super.concreteAssociate();

		const endpointParams = this.getRequiredEndpointParameters(commands.EndpointParamReplacementPart.ParamName);

		(this.component as any).method = net.stringToHttpMethod((<descriptor.RemoteCommandDescriptor> this.componentDescriptor).handler.method || "GET");
		(this.component as any).endpoint = {
			raw: (<descriptor.RemoteCommandDescriptor> this.componentDescriptor).handler.endpoint,
			params: endpointParams
		};

		(this.component as any).syntax.forEach((rule: syntax.SyntaxRule) => {
			const syntaxParams = rule.getTokens().filter(t => t.getTokenType() == syntax.TokenType.Parameter) as syntax.Parameter[];
			const syntaxParamsNames = syntaxParams.map<string>(param => param.getName());
			const existing = endpointParams.filter(name => !syntaxParamsNames.includes(name));

			if (!existing.empty() && !existing.every(name => (this.component.getParent() as modules.Module).hasParameter(name))) {
				throw new coreTypes.Exception(
					`Cannot build remote command ${ this.component.getPath().toString() }, ` +
					`since syntax rule "${ rule.raw }" does not provide all the parameters ` +
					`required by endpoint "${ (this.component as any).endpoint.raw }"`
				);
			}
		});
	}

	private getRequiredEndpointParameters(part?: commands.EndpointParamReplacementPart) {
		let matches = [] as string[];
		const endpoint = (this.componentDescriptor as descriptor.RemoteCommandDescriptor).handler.endpoint;
		let match = commands.ENDPOINT_ARGUMENTS_REGEX.exec(endpoint);

		while (match != null) {
			if (part) {
				matches.push(match[part]);
			} else {
				matches = matches.concat(match);
			}
			match = commands.ENDPOINT_ARGUMENTS_REGEX.exec(endpoint);
		}

		return matches;
	}

}
