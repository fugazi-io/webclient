/// <reference path="../core/utils.ts" />
/// <reference path="components.ts" />
/// <reference path="constraints.ts" />

/**
 * Created by nitzan on 12/03/2016.
 */

namespace fugazi.components.types {
	export interface Definition {}

	export interface TextualDefinition extends Definition, String {}

	export interface StructDefinition extends Definition, fugazi.PlainObject<Definition> {}

	export abstract class Type extends components.Component {
		public constructor() {
			super(components.ComponentType.Type);
		}

		public is(type: Type | string): boolean {
			if (type instanceof Type) {
				return type  === anyTypeInstance || (type.parent == this.parent && type.name === this.name);
			}

			if (typeof type === "string") {
				return type.indexOf(".") > 0 ? this.getPath().toString() === type : this.name === type;
			}

			return false;
		}

		public validate(value: any): boolean {
			return this.satisfies(value);
		}

		public toPathedString(): string {
			return this.path.toString();
		}

		public abstract satisfies(value: any): boolean;
	}

	export class CoreType extends Type {
		private check: (value: any) => boolean;

		constructor(parent: components.Component, name: string, title: string, satisfyAndValidateFunction: (value: any) => boolean);
		constructor(parent: components.Component, name: string, title: string, description: string, satisfyAndValidateFunction: (value: any) => boolean);
		constructor(...args: any[]) {
			super();

			this.parent = args[0];
			this.name = args[1];
			this.title = args[2];

			if (args.length === 4) {
				this.description = null;
				this.check = args[3];
			} else if (args.length === 5) {
				this.description = args[3];
				this.check = args[4];
			} else {
				throw new fugazi.Exception("illegal number of arguments");
			}

			this.path = this.parent.getPath().child(this.name);
		}

		public satisfies(value: any): boolean {
			return this.check(value);
		}

		public validate(value: any): boolean {
			return super.validate(value) && this.check(value);
		}
	}

	let voidTypeInstance: VoidType;
	export class VoidType extends CoreType {
		constructor(parent:components.Component) {
			super(parent, "void", "Void", value => value === undefined);
			voidTypeInstance = this;
		}
	}

	let anyTypeInstance: VoidType;
	export class AnyType extends CoreType {
		constructor(parent: components.Component) {
			super(parent, "any", "Any", value => true);
			anyTypeInstance = this;
		}

		public is(type: types.Type | string): boolean {
			if (typeof type === "string") {
				type = registry.getType(type as string);
			}

			return type != voidTypeInstance;
		}
	}

	export class ConstrainedType extends Type {
		protected base: Type;
		protected constraints: constraints.BoundConstraint[];

		public constructor() {
			super();
			this.constraints = [];
		}

		public getPath(): Path {
			return this.isAnonymous() ? this.base.getPath() : super.getPath();
		}

		public getHierarchicPaths(): Path[] {
			let paths: Path[] = [this.getPath()];

			if (this.isAnonymous()) {
				return fugazi.is(this.base, ConstrainedType) ? (<ConstrainedType> this.base).getHierarchicPaths() : paths;
			}

			if (fugazi.is(this.base, ConstrainedType)) {
				paths = paths.concat((<ConstrainedType> this.base).getHierarchicPaths());
			} else {
				paths.push(this.base.getPath());
			}

			return paths;
		}

		public getName(): string {
			return this.isAnonymous() ? this.base.getName() : super.getName();
		}

		public is(type: Type | string): boolean {
			return super.is(type) || this.base.is(type);
		}

		public satisfies(value: any): boolean {
			return this.base.satisfies(value);
		}

		public validate(value: any): boolean {
			return this.base.validate(value) && this.constraints.every(constraint => constraint.validate(value));
		}
		
		public getConstraintParamValue(constraint: constraints.Constraint, paramName: string): any {
			let value: any = null;

			for (let i = 0; i < this.constraints.length; i++) {
				if (this.constraints[i].is(constraint)) {
					value = this.constraints[i].getParamValue(paramName);
				}
			}

			if (value == null && this.base && this.base instanceof ConstrainedType) {
				value = (<ConstrainedType> this.base).getConstraintParamValue(constraint, paramName);
			}

			return value;
		}

		public getConstraintParamValues(constraint: constraints.Constraint, paramName: string): any[] {
			let values: any[] = [];

			for (let i = 0; i < this.constraints.length; i++) {
				if (this.constraints[i].is(constraint)) {
					values.push(this.constraints[i].getParamValue(paramName));
				}
			}

			if (this.base && this.base instanceof ConstrainedType) {
				values = values.concat((<ConstrainedType> this.base).getConstraintParamValues(constraint, paramName));
			}

			return values;
		}
		
		public toString(): string {
			/*let str: string = this.isAnonymous() ? this.base.toString() : super.toString(),
				genericsConstraint = <types.constraints.Constraint> registry.get(ComponentType.Constraint, "generics"),
				genericsType = <types.Type> this.getConstraintParamValue(genericsConstraint, "type");

			if (genericsType) {
				str += "<" + genericsType.toString() + ">";
			}

			return str;*/
			return this.isAnonymous() ? this.base.toString() : super.toString();
		}

		public toPathedString(): string {
			let str: string = this.isAnonymous() ? this.base.toPathedString() : super.toPathedString(),
				genericsConstraint = <types.constraints.Constraint> registry.get(ComponentType.Constraint, "generics"),
				genericsType = <types.Type> this.getConstraintParamValue(genericsConstraint, "type");

			if (genericsType) {
				str += "<" + genericsType.toPathedString() + ">";
			}

			return str;
		}

		private isAnonymous(): boolean {
			return super.getName().startsWith("anonymous");
		}
	}

	interface ReducedValue {
		base: any;
		self: any;
	}

	class ReducedConstrainedType extends ConstrainedType {
		private reducer: (value: any) => ReducedValue;

		constructor() {
			super();
			this.reducer = null;
		}

		public validate(value: any): boolean {
			var reduced: ReducedValue = this.reducer != null ? this.reducer(value) : { base: value, self: value };
			return this.base.validate(reduced.base) && this.constraints.every(constraint => constraint.validate(reduced.self));
		}
	}

	export namespace descriptor {
		export interface Descriptor extends components.descriptor.Descriptor {
			type: Definition;
		}

		export interface StructDescriptor extends Descriptor {
			base: string;
		}

		export function isAnonymousDefinition(definition: TextualDefinition): boolean {
			return definition.indexOf("<") > 0 || definition.indexOf("[") > 0;
		}
	}

	export namespace builder {
		const textualDefinitionPattern: RegExp = /^([a-z0-9\.]+)(?:<(.+)>)?(?:\[(.+)\])?$/i;

		export function create(typeDescriptor: string | descriptor.Descriptor | { [name: string]: any }, parent: components.builder.Builder<components.Component>): components.builder.Builder<Type> {
			let loader: components.descriptor.Loader<descriptor.Descriptor>;

			if (fugazi.is(typeDescriptor, String)) {
				typeDescriptor = descriptorFromAnonymousDefinition(typeDescriptor);
			}

			if (!(typeDescriptor as any).type) {
				typeDescriptor = descriptorFromAnonymousDefinition(typeDescriptor);
			}
			loader = new components.descriptor.ExistingLoader(<descriptor.Descriptor> typeDescriptor);

			switch (getDefinitionType((<descriptor.Descriptor> typeDescriptor).type)) {
				case "text":
					return new TextualBuilder(loader, parent);

				case "struct":
					return new StructBuilder(loader, parent);
			}

			throw new components.builder.Exception("unable find a suitable builder for the descriptor");
		}

		function descriptorFromAnonymousDefinition(definition: Definition): descriptor.Descriptor {
			var anonymousDescriptor: descriptor.Descriptor = <descriptor.Descriptor> components.builder.createAnonymousDescriptor(ComponentType.Type);
			anonymousDescriptor.type = <any> definition;
			return anonymousDescriptor;
		}

		function getDefinitionType(definition: Definition): string {
			if (fugazi.is(definition, String) && textualDefinitionPattern.test(<string> definition)) {
				return "text";
			}

			if (fugazi.isPlainObject(definition)) {
				return "struct";
			}

			return "unknown";
		}

		abstract class TypeBuilder<T extends Definition> extends components.builder.BaseBuilder<Type, descriptor.Descriptor> {
			protected base: string;

			protected onDescriptorReady(): void {
				this.parseDefinition(<T> this.componentDescriptor.type);
			}

			protected concreteAssociate(): void {
				if (this.base) {
					(<any> this.component).base = this.resolve(ComponentType.Type, this.base);
					if (fugazi.isNothing((<any> this.component).base)) {
						throw new components.builder.Exception("base " + this.base + " cannot be resolved for type + " + this.getName());
					}
				}
			}

			protected abstract parseDefinition(definition: T): void;
		}

		class TextualBuilder extends TypeBuilder<TextualDefinition> {
			private genericsReference: string;
			private genericsBuilder: TypeBuilder<TextualDefinition>;
			private constraints: string;

			constructor(loader: components.descriptor.Loader<descriptor.Descriptor>, parent?: components.builder.Builder<Component>) {
				super(ConstrainedType, loader, parent);
			}

			protected concreteBuild(): void {
				if (this.genericsBuilder) {
					this.genericsBuilder.build().then(this.innerBuilderCompleted.bind(this), this.future.reject);
				} else {
					this.future.resolve(this.component);
				}
			}

			protected concreteAssociate(): void {
				let genericsType: Type,
					constraint: constraints.Constraint,
					boundConstraints: constraints.BoundConstraint[];

				super.concreteAssociate();

				if (this.genericsReference || this.genericsBuilder) {
					if (this.genericsBuilder) {
						this.genericsBuilder.associate();
						genericsType = (<any> this.genericsBuilder).component;
					} else {
						genericsType = this.resolve(ComponentType.Type, this.genericsReference) as Type;
					}

					constraint = <constraints.Constraint> this.resolve(ComponentType.Constraint, "generics");
					(<any> this.component).constraints.push(constraint.bindWithArray([genericsType]));
				}

				if (this.constraints) {
					boundConstraints = constraints.createBoundConstraints(this.constraints, this);
					(<any> this.component).constraints.extend(boundConstraints);
				}
			}

			protected parseDefinition(definition: TextualDefinition): void {
				let anonymousDescriptor: descriptor.Descriptor = descriptorFromAnonymousDefinition(definition),
					match: RegExpMatchArray = definition.match(textualDefinitionPattern);

				if (match === null) {
					throw new components.builder.Exception("illegal definition");
				}

				this.base = match[1];

				// generics
				if (match[2]) {
					if (descriptor.isAnonymousDefinition(match[2])) {
						this.innerBuilderCreated();
						anonymousDescriptor.type = match[2];
						this.genericsBuilder = <TypeBuilder<TextualDefinition>> create(anonymousDescriptor, this);
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

		class StructBuilder extends TypeBuilder<StructDefinition> {
			private fieldsReferences: collections.Map<string>;
			private fieldsBuilders: collections.Map<TypeBuilder<Definition>>;

			constructor(loader: components.descriptor.Loader<descriptor.Descriptor>, parent?: components.builder.Builder<Component>) {
				super(ReducedConstrainedType, loader, parent);
			}

			protected concreteBuild(): void {
				if (fugazi.isNothing(this.base)) {
					this.base = "map";
				} else {
					(<any> this.getComponent()).reducer = value => {
						var reduced: ReducedValue = {
							base: collections.map<any>(),
							self: collections.map<any>()
						};

						if (fugazi.isPlainObject(value)) {
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
				let fields: collections.Map<Type> = collections.map<Type>(),
					constraint: constraints.Constraint = <constraints.Constraint> this.resolve(ComponentType.Constraint, "struct");

				super.concreteAssociate();

				this.fieldsReferences.keys().forEach(name => {
					fields.set(name, <Type> this.resolve(ComponentType.Type, this.fieldsReferences.get(name)));
				});

				this.fieldsBuilders.keys().forEach(name => {
					let fieldBuilder = this.fieldsBuilders.get(name);
					fieldBuilder.associate();
					fields.set(name, <Type> (<any> fieldBuilder).component);
				});
				
				(<any> this.component).constraints.push(constraint.bindWithArray([fields]));
			}

			protected parseDefinition(definition: StructDefinition): void {
				let fieldNames: string[] = Object.keys(definition);

				this.fieldsReferences = collections.map<string>();
				this.fieldsBuilders = collections.map<TypeBuilder<Definition>>();
				this.base = (<descriptor.StructDescriptor> this.componentDescriptor).base;

				fieldNames.forEach(fieldName => {
					let fieldDefinition: Definition = definition[fieldName],
						fieldDefinitionType: string = getDefinitionType(fieldDefinition);

					if (fieldDefinitionType === "text") {
						if (descriptor.isAnonymousDefinition(<TextualDefinition> fieldDefinition)) {
							this.innerBuilderCreated();
							this.fieldsBuilders.set(fieldName, <TypeBuilder<TextualDefinition>> create(<string> fieldDefinition, this));
						} else {
							this.fieldsReferences.set(fieldName, <string> fieldDefinition);
						}
					} else if (fieldDefinitionType === "struct") {
						this.innerBuilderCreated();
						this.fieldsBuilders.set(fieldName, <TypeBuilder<StructDefinition>> create(descriptorFromAnonymousDefinition(fieldDefinition), this));
					} else {
						throw new components.builder.Exception("illegal field " + fieldName);
					}
				});
			}
		}
	}
}