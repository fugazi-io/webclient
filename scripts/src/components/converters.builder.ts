import * as types from "./types";
import * as coreTypes from "../core/types";

import * as components from "./components";
import * as componentsBuilder from "./components.builder";
import * as componentsDescriptor from "./components.descriptor";
import * as converters from "./converters";
import * as descriptor from "./converters.descriptor";

export function create(converterDescriptor: descriptor.Descriptor, parent: componentsBuilder.Builder<components.Component>): componentsBuilder.Builder<converters.Converter> {
	return new ConverterBuilder(converters.Converter, new componentsDescriptor.ExistingLoader(converterDescriptor), parent);
}

class ConverterBuilder extends componentsBuilder.BaseBuilder<converters.Converter, descriptor.Descriptor> {
	protected onDescriptorReady(): void {
	}

	protected concreteBuild(): void {
		this.future.resolve(this.component);
	}

	protected concreteAssociate(): void {
		(this.component as any).input = this.resolve(components.ComponentType.Type, this.componentDescriptor.input);
		(this.component as any).output = this.resolve(components.ComponentType.Type, this.componentDescriptor.output);
		(this.component as any).conversionFunction = this.componentDescriptor.converter;
	}
}

