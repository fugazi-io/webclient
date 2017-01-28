/// <reference path="registry.ts" />
/// <reference path="types.ts" />

/**
 * Created by nitzan on 21/03/2016.
 */

module fugazi.components.types.constraints {
	export function createBoundConstraints(definition: string, typeBuilder: components.builder.Builder<Type>): BoundConstraint[] {
		return new Binder(definition, typeBuilder).getBound();
	}

	export interface BoundConstraintValidator {
		(value: any): boolean;
	}

	export interface UnboundConstraintValidator {
		(...args: any[]): BoundConstraintValidator;
	}

	export class Constraint extends components.Component {
		protected types: types.Type[];
		protected paramNames: string[];
		protected validator: UnboundConstraintValidator;

		public constructor() {
			super(components.ComponentType.Constraint);
			this.types = [];
			this.paramNames = [];
		}

		public handles(type: Type): boolean {
			return this.types.some(function(other: Type): boolean {
				return type.is(other);
			});
		}

		public bindWithArray(args: any[]): BoundConstraint {
			return new BoundConstraint(this, this.paramNames, args, this.validator.apply(null, args));
		}
	}

	export class CoreConstraint extends Constraint {
		constructor(parent: components.Component, name: string, title: string, types: types.Type[], paramNames: string[], validator: UnboundConstraintValidator);
		constructor(parent: components.Component, name: string, title: string, description: string, types: types.Type[], paramNames: string[], validator: UnboundConstraintValidator);
		constructor(...args: any[]) {
			super();

			this.parent = args[0];
			this.name = args[1];
			this.title = args[2];

			if (args.length === 6) {
				this.description = null;
				this.types = args[3];
				this.paramNames = args[4];
				this.validator = args[5];
			} else if (args.length === 7) {
				this.description = args[3];
				this.types = args[4];
				this.paramNames = args[5];
				this.validator = args[6];
			} else {
				throw new fugazi.Exception("illegal number of arguments");
			}
		}
	}

	export class BoundConstraint {
		private constraint: Constraint;
		private paramNames: string[];
		private paramValues: any[];
		private validator: BoundConstraintValidator;

		constructor(constraint: Constraint, paramNames: string[], paramValues: any[], validator: BoundConstraintValidator) {
			this.constraint = constraint;
			this.paramNames = paramNames;
			this.paramValues = paramValues;
			this.validator = validator;
		}

		public is(constraint: Constraint): boolean {
			return this.constraint === constraint;
		}

		public validate(value: any): boolean {
			return this.validator(value);
		}

		public getParamValue(name: string): any {
			let index = this.paramNames.indexOf(name);
			return index < 0 ? null : this.paramValues[index];
		}
	}

	export module descriptor {
		export interface Descriptor extends components.descriptor.Descriptor {
			types: string[];
			validator: UnboundConstraintValidator;
			params?: string[];
		}
	}

	export module builder {
		export function create(constraintDescriptor: descriptor.Descriptor, parent: components.builder.Builder<components.Component>): components.builder.Builder<Constraint> {
			return new Builder(new components.descriptor.ExistingLoader(constraintDescriptor), parent);
		}

		class Builder extends components.builder.BaseBuilder<Constraint, descriptor.Descriptor> {
			private types: string[];
			private validator: UnboundConstraintValidator;

			constructor(loader: components.descriptor.Loader<descriptor.Descriptor>, parent?: components.builder.Builder<Component>) {
				super(Constraint, loader, parent);
			}

			protected onDescriptorReady(): void {
				this.types = this.componentDescriptor.types;
				this.validator = this.componentDescriptor.validator;
			}

			protected concreteBuild(): void {
				if (fugazi.is((<descriptor.Descriptor> this.componentDescriptor).params, Array)) {
					(<any> this.component).paramNames = (<descriptor.Descriptor> this.componentDescriptor).params;
				}

				(<any> this.component).validator = this.validator;
				this.future.resolve(this.component);
			}

			protected concreteAssociate(): void {
				var type: Type;

				for (var i = 0; i < this.types.length; i++) {
					type = <Type> this.resolve(components.ComponentType.Type, this.types[i]);

					if (type == null) {
						throw new components.builder.Exception("unresolved type " + this.types[i]);
					}

					(<any> this.component).types.push(type);
				}
			}
		}
	}

	class Binder {
		private static SINLGE_QUOTES_REGEX: RegExp = /'([^'\\]*(?:\\.[^'\\]*)*)'/;
		private static DOUBLE_QUOTES_REGEX: RegExp = /"([^"\\]*(?:\\.[^"\\]*)*)"/;

		private counter: number;
		private definition: string;
		private quoted: collections.Map<string>;
		private typeBuilder: components.builder.Builder<Type>;

		constructor(definition: string, typeBuilder: components.builder.Builder<Type>) {
			this.counter = 0;
			this.definition = definition;
			this.typeBuilder = typeBuilder;
			this.quoted = collections.map<string>();
		}

		getBound(): BoundConstraint[] {
			var firstSingle: number = this.definition.indexOf("'"),
				firstDouble: number = this.definition.indexOf("\"");

			if (firstSingle > 0 && firstDouble > 0) {
				if (firstSingle < firstDouble) {
					this.replaceQuoted(Binder.SINLGE_QUOTES_REGEX);
					this.replaceQuoted(Binder.DOUBLE_QUOTES_REGEX);
				} else {
					this.replaceQuoted(Binder.DOUBLE_QUOTES_REGEX);
					this.replaceQuoted(Binder.SINLGE_QUOTES_REGEX);
				}
			} else if (firstSingle > 0) {
				this.replaceQuoted(Binder.SINLGE_QUOTES_REGEX);
			} else if (firstDouble > 0) {
				this.replaceQuoted(Binder.DOUBLE_QUOTES_REGEX);
			}

			return this.breakToParts().map<BoundConstraint>(this.createConstraint.bind(this));
		}

		private replaceQuoted(regex: RegExp): void {
			var name: string;

			while (regex.test(this.definition)) {
				name = "@" + ++this.counter;
				this.quoted.set(name, this.definition.match(regex)[1]);
				this.definition = this.definition.replace(regex, name);
			}
		}

		private breakToParts(): Array<string[]> {
			var parts: Array<string | string[]> = this.definition.split(/\s*,\s*/g);

			for (var i = 0; i < parts.length; i++) {
				parts[i] = (parts[i] as string).split(/\s+/g);

				for (var j = 0; j < parts[i].length; j++) {
					if (this.quoted.has(parts[i][j])) {
						(parts[i] as string[])[j] = this.quoted.get(parts[i][j]);
					}
				}
			}

			return <Array<string[]>> parts;
		}

		private createConstraint(parts: string[]): BoundConstraint {
			var unbound: Constraint = this.typeBuilder.resolve<Constraint>(ComponentType.Constraint, parts[0]);

			if (fugazi.isNothing(unbound)) {
				throw new components.builder.Exception("can't resolve constraint: " + parts[0]);
			}

			if (!unbound.handles(this.typeBuilder.getComponent())) {
				throw new components.builder.Exception("type \"" + this.typeBuilder.getComponent().getName() + "\" isn't handled by constraint \"" + unbound.getName() + "\"");
			}

			parts.remove(0);
			return unbound.bindWithArray(parts);
		}
	}
}