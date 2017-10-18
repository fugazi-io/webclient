import * as coreTypes from "../core/types";
import * as constraints from "./constraints";
import * as components from "./components";
import * as registry from "./registry";

export interface Definition {
}

export interface TextualDefinition extends Definition, String {
}

export interface StructDefinition extends Definition, coreTypes.PlainObject<Definition> {
}

export abstract class Type extends components.Component {
	public constructor() {
		super(components.ComponentType.Type);
	}

	public is(type: Type | string): boolean {
		if (type instanceof Type) {
			return type === anyTypeInstance || (type.parent == this.parent && type.name === this.name);
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
			throw new coreTypes.Exception("illegal number of arguments");
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
	constructor(parent: components.Component) {
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

	public is(type: Type | string): boolean {
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

	public getPath(): components.Path {
		return this.isAnonymous() ? this.base.getPath() : super.getPath();
	}

	public getHierarchicPaths(): components.Path[] {
		let paths: components.Path[] = [this.getPath()];

		if (this.isAnonymous()) {
			return coreTypes.is(this.base, ConstrainedType) ? (<ConstrainedType> this.base).getHierarchicPaths() : paths;
		}

		if (coreTypes.is(this.base, ConstrainedType)) {
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
		 genericsConstraint = <constraints.Constraint> registry.get(ComponentType.Constraint, "generics"),
		 genericsType = <Type> this.getConstraintParamValue(genericsConstraint, "type");

		 if (genericsType) {
		 str += "<" + genericsType.toString() + ">";
		 }

		 return str;*/
		return this.isAnonymous() ? this.base.toString() : super.toString();
	}

	public toPathedString(): string {
		let str: string = this.isAnonymous() ? this.base.toPathedString() : super.toPathedString(),
			genericsConstraint = <constraints.Constraint> registry.get(components.ComponentType.Constraint, "generics"),
			genericsType = <Type> this.getConstraintParamValue(genericsConstraint, "type");

		if (genericsType) {
			str += "<" + genericsType.toPathedString() + ">";
		}

		return str;
	}

	private isAnonymous(): boolean {
		return super.getName().startsWith("anonymous");
	}
}

export interface ReducedValue {
	base: any;
	self: any;
}

export class ReducedConstrainedType extends ConstrainedType {
	private reducer: (value: any) => ReducedValue;

	constructor() {
		super();
		this.reducer = null;
	}

	public validate(value: any): boolean {
		var reduced: ReducedValue = this.reducer != null ? this.reducer(value) : {base: value, self: value};
		return this.base.validate(reduced.base) && this.constraints.every(constraint => constraint.validate(reduced.self));
	}
}
