import * as collections from "../core/types.collections";
import * as coreTypes from "../core/types";
import * as types from "./types";
import * as components from "./components";
import * as builder from "./components.builder";

export function createBoundConstraints(definition: string, typeBuilder: builder.Builder<types.Type>): BoundConstraint[] {
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

	public handles(type: types.Type): boolean {
		return this.types.some(function (other: types.Type): boolean {
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
			throw new coreTypes.Exception("illegal number of arguments");
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

class Binder {
	private static SINLGE_QUOTES_REGEX: RegExp = /'([^'\\]*(?:\\.[^'\\]*)*)'/;
	private static DOUBLE_QUOTES_REGEX: RegExp = /"([^"\\]*(?:\\.[^"\\]*)*)"/;

	private counter: number;
	private definition: string;
	private quoted: collections.Map<string>;
	private typeBuilder: builder.Builder<types.Type>;

	constructor(definition: string, typeBuilder: builder.Builder<types.Type>) {
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
		var unbound: Constraint = this.typeBuilder.resolve<Constraint>(components.ComponentType.Constraint, parts[0]);

		if (coreTypes.isNothing(unbound)) {
			throw new builder.Exception("can't resolve constraint: " + parts[0]);
		}

		if (!unbound.handles(this.typeBuilder.getComponent())) {
			throw new builder.Exception("type \"" + this.typeBuilder.getComponent().getName() + "\" isn't handled by constraint \"" + unbound.getName() + "\"");
		}

		parts.remove(0);
		return unbound.bindWithArray(parts);
	}
}
