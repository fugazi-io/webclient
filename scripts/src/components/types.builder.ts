import * as collections from "../core/types.collections";
import * as coreTypes from "../core/types";
import * as constraints from "./constraints";
import * as components from "./components";
import * as componentsDescriptor from "./components.descriptor";
import * as componentsBuilder from "./components.builder";
import * as descriptor from "./types.descriptor";
import * as types from "./types";

const textualDefinitionPattern: RegExp = /^([a-z0-9\.]+)(?:<(.+)>)?(?:\[(.+)\])?$/i;

export function create(typeDescriptor: string | descriptor.Descriptor | { [name: string]: any }, parent: componentsBuilder.Builder<components.Component>): componentsBuilder.Builder<types.Type> {
	let loader: componentsDescriptor.Loader<descriptor.Descriptor>;

	if (coreTypes.is(typeDescriptor, String)) {
		typeDescriptor = descriptorFromAnonymousDefinition(typeDescriptor);
	}

	if (!(typeDescriptor as any).type) {
		typeDescriptor = descriptorFromAnonymousDefinition(typeDescriptor);
	}
	loader = new componentsDescriptor.ExistingLoader(<descriptor.Descriptor> typeDescriptor);

	switch (getDefinitionType((<descriptor.Descriptor> typeDescriptor).type)) {
		case "text":
			return new TextualBuilder(loader, parent);

		case "struct":
			return new StructBuilder(loader, parent);
	}

	throw new componentsBuilder.Exception("unable find a suitable builder for the descriptor");
}

function descriptorFromAnonymousDefinition(definition: types.Definition): descriptor.Descriptor {
	var anonymousDescriptor: descriptor.Descriptor = <descriptor.Descriptor> componentsBuilder.createAnonymousDescriptor(components.ComponentType.Type);
	anonymousDescriptor.type = <any> definition;
	return anonymousDescriptor;
}

function getDefinitionType(definition: types.Definition): string {
	if (coreTypes.is(definition, String) && textualDefinitionPattern.test(<string> definition)) {
		return "text";
	}

	if (coreTypes.isPlainObject(definition)) {
		return "struct";
	}

	return "unknown";
}

abstract class TypeBuilder<T extends types.Definition> extends componentsBuilder.BaseBuilder<types.Type, descriptor.Descriptor> {
	protected base: string;

	protected onDescriptorReady(): Promise<void> {
		this.parseDefinition(<T> this.componentDescriptor.type);
		return Promise.resolve();
	}

	protected concreteAssociate(): void {
		if (this.base) {
			(<any> this.component).base = this.resolve(components.ComponentType.Type, this.base);
			if (coreTypes.isNothing((<any> this.component).base)) {
				throw new componentsBuilder.Exception("base " + this.base + " cannot be resolved for type + " + this.getName());
			}
		}
	}

	protected abstract parseDefinition(definition: T): void;
}

class TextualBuilder extends TypeBuilder<types.TextualDefinition> {
	private genericsReference: string;
	private genericsBuilder: TypeBuilder<types.TextualDefinition>;
	private constraints: string;

	constructor(loader: componentsDescriptor.Loader<descriptor.Descriptor>, parent?: componentsBuilder.Builder<components.Component>) {
		super(types.ConstrainedType, loader, parent);
	}

	protected concreteBuild(): void {
		if (this.genericsBuilder) {
			this.genericsBuilder.build().then(this.innerBuilderCompleted.bind(this), this.future.reject);
		} else {
			this.future.resolve(this.component);
		}
	}

	protected concreteAssociate(): void {
		let genericsType: types.Type,
			constraint: constraints.Constraint,
			boundConstraints: constraints.BoundConstraint[];

		super.concreteAssociate();

		if (this.genericsReference || this.genericsBuilder) {
			if (this.genericsBuilder) {
				this.genericsBuilder.associate();
				genericsType = (<any> this.genericsBuilder).component;
			} else {
				genericsType = this.resolve(components.ComponentType.Type, this.genericsReference) as types.Type;
			}

			constraint = <constraints.Constraint> this.resolve(components.ComponentType.Constraint, "generics");
			(<any> this.component).constraints.push(constraint.bindWithArray([genericsType]));
		}

		if (this.constraints) {
			boundConstraints = constraints.createBoundConstraints(this.constraints, this);
			(<any> this.component).constraints.extend(boundConstraints);
		}
	}

	protected parseDefinition(definition: types.TextualDefinition): void {
		let anonymousDescriptor: descriptor.Descriptor = descriptorFromAnonymousDefinition(definition),
			match: RegExpMatchArray = definition.match(textualDefinitionPattern);

		if (match === null) {
			throw new componentsBuilder.Exception("illegal definition");
		}

		this.base = match[1];

		// generics
		if (match[2]) {
			if (descriptor.isAnonymousDefinition(match[2])) {
				this.innerBuilderCreated();
				anonymousDescriptor.type = match[2];
				this.genericsBuilder = <TypeBuilder<types.TextualDefinition>> create(anonymousDescriptor, this);
			} else {
				this.genericsReference = match[2];
			}
		}

		// constraints
		if (match[3]) {
			this.constraints = match[3];
		}
	}
}

class StructBuilder extends TypeBuilder<types.StructDefinition> {
	private fieldsReferences: collections.FugaziMap<string>;
	private fieldsBuilders: collections.FugaziMap<TypeBuilder<types.Definition>>;

	constructor(loader: componentsDescriptor.Loader<descriptor.Descriptor>, parent?: componentsBuilder.Builder<components.Component>) {
		super(types.ReducedConstrainedType, loader, parent);
	}

	protected concreteBuild(): void {
		if (coreTypes.isNothing(this.base)) {
			this.base = "map";
		} else {
			(<any> this.getComponent()).reducer = value => {
				var reduced: types.ReducedValue = {
					base: collections.map<any>(),
					self: collections.map<any>()
				};

				if (coreTypes.isPlainObject(value)) {
					value = collections.map(value);
				}

				value.keys().forEach(name => {
					if (this.fieldsReferences.has(name) || this.fieldsBuilders.has(name)) {
						reduced.self.set(name, value.get(name));
					} else {
						reduced.base.set(name, value.get(name));
					}
				});

				return reduced;
			};
		}

		if (this.fieldsBuilders.empty()) {
			this.future.resolve(this.component);
		} else {
			this.fieldsBuilders.values().forEach(fieldBuilder => fieldBuilder.build().then(this.innerBuilderCompleted.bind(this), this.future.reject));
		}
	}

	protected concreteAssociate(): void {
		let fields: collections.FugaziMap<types.Type> = collections.map<types.Type>(),
			constraint: constraints.Constraint = <constraints.Constraint> this.resolve(components.ComponentType.Constraint, "struct");

		super.concreteAssociate();

		this.fieldsReferences.keys().forEach(name => {
			fields.set(name, <types.Type> this.resolve(components.ComponentType.Type, this.fieldsReferences.get(name)));
		});

		this.fieldsBuilders.keys().forEach(name => {
			let fieldBuilder = this.fieldsBuilders.get(name);
			fieldBuilder.associate();
			fields.set(name, <types.Type> (<any> fieldBuilder).component);
		});

		(<any> this.component).constraints.push(constraint.bindWithArray([fields]));
	}

	protected parseDefinition(definition: types.StructDefinition): void {
		let fieldNames: string[] = Object.keys(definition);

		this.fieldsReferences = collections.map<string>();
		this.fieldsBuilders = collections.map<TypeBuilder<types.Definition>>();
		this.base = (<descriptor.StructDescriptor> this.componentDescriptor).base;

		fieldNames.forEach(fieldName => {
			let fieldDefinition: types.Definition = definition[fieldName],
				fieldDefinitionType: string = getDefinitionType(fieldDefinition);

			if (fieldDefinitionType === "text") {
				if (descriptor.isAnonymousDefinition(<types.TextualDefinition> fieldDefinition)) {
					this.innerBuilderCreated();
					this.fieldsBuilders.set(fieldName, <TypeBuilder<types.TextualDefinition>> create(<string> fieldDefinition, this));
				} else {
					this.fieldsReferences.set(fieldName, <string> fieldDefinition);
				}
			} else if (fieldDefinitionType === "struct") {
				this.innerBuilderCreated();
				this.fieldsBuilders.set(fieldName, <TypeBuilder<types.StructDefinition>> create(descriptorFromAnonymousDefinition(fieldDefinition), this));
			} else {
				throw new componentsBuilder.Exception("illegal field " + fieldName);
			}
		});
	}
}
