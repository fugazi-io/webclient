import * as coreTypes from "../core/types";
import * as types from "./types";
import * as components from "./components";
import * as componentsBuilder from "./components.builder";
import * as componentsDescriptor from "./components.descriptor";
import * as constraints from "./constraints";
import * as descriptor from "./constraints.descriptor";

export function create(constraintDescriptor: descriptor.Descriptor, parent: componentsBuilder.Builder<components.Component>): componentsBuilder.Builder<constraints.Constraint> {
	return new ConstraintBuilder(new componentsDescriptor.ExistingLoader(constraintDescriptor), parent);
}

class ConstraintBuilder extends componentsBuilder.BaseBuilder<constraints.Constraint, descriptor.Descriptor> {
	private types: string[];
	private validator: constraints.UnboundConstraintValidator;

	constructor(loader: componentsDescriptor.Loader<descriptor.Descriptor>, parent?: componentsBuilder.Builder<components.Component>) {
		super(constraints.Constraint, loader, parent);
	}

	protected onDescriptorReady(): Promise<void> {
		this.types = this.componentDescriptor.types;
		this.validator = this.componentDescriptor.validator;
		return Promise.resolve();
	}

	protected concreteBuild(): void {
		if (coreTypes.is((<descriptor.Descriptor> this.componentDescriptor).params, Array)) {
			(<any> this.component).paramNames = (<descriptor.Descriptor> this.componentDescriptor).params;
		}

		(<any> this.component).validator = this.validator;
		this.future.resolve(this.component);
	}

	protected concreteAssociate(): void {
		let type: types.Type;

		for (var i = 0; i < this.types.length; i++) {
			type = <types.Type> this.resolve(components.ComponentType.Type, this.types[i]);

			if (type == null) {
				throw new componentsBuilder.Exception("unresolved type " + this.types[i]);
			}

			(<any> this.component).types.push(type);
		}
	}
}
