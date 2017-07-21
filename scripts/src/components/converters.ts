import * as types from "./types";
import * as coreTypes from "../core/types";
import * as components from "./components";

export class Converter extends components.Component {
	private input: types.Type;
	private output: types.Type;
	private conversionFunction: (input: any) => any;

	constructor() {
		super(components.ComponentType.Converter);
	}

	public convert(value: any): any {
		if (!this.input.validate(value)) {
			throw new coreTypes.Exception(`failed to convert. input isn't a valid ${ this.input.getName() }`);
		}

		let converted = this.conversionFunction(value);

		if (!this.output.validate(converted)) {
			throw new coreTypes.Exception(`failed to convert. converted input isn't a valid ${ this.output.getName() }`);
		}

		return converted;
	}

	public getInput(): types.Type {
		return this.input;
	}

	public getOutput(): types.Type {
		return this.output;
	}
}