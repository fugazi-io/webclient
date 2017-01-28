/// <reference path="components.ts" />
/// <reference path="types.ts" />

/**
 * Created by nitzan on 20/06/2016.
 */

namespace fugazi.components.converters {
	export class Converter extends Component {
		private input: types.Type;
		private output: types.Type;
		private conversionFunction: (input: any) => any;

		constructor() {
			super(ComponentType.Converter);
		}

		public convert(value: any): any {
			if (!this.input.validate(value)) {
				throw new Exception(`failed to convert. input isn't a valid ${ this.input.getName() }`);
			}

			let converted = this.conversionFunction(value);

			if (!this.output.validate(converted)) {
				throw new Exception(`failed to convert. converted input isn't a valid ${ this.output.getName() }`);
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

	export namespace descriptor {
		export interface Descriptor extends components.descriptor.Descriptor {
			input: string;
			output: string;
			converter: (input: any) => any;
		}
	}

	export namespace builder {
		export function create(converterDescriptor: descriptor.Descriptor, parent: components.builder.Builder<components.Component>): components.builder.Builder<Converter> {
			return new Builder(Converter, new components.descriptor.ExistingLoader(converterDescriptor), parent);
		}

		class Builder extends components.builder.BaseBuilder<Converter, descriptor.Descriptor> {
			protected onDescriptorReady(): void {}

			protected concreteBuild(): void {
				this.future.resolve(this.component);
			}

			protected concreteAssociate(): void {
				(this.component as any).input = this.resolve(ComponentType.Type, this.componentDescriptor.input);
				(this.component as any).output = this.resolve(ComponentType.Type, this.componentDescriptor.output);
				(this.component as any).conversionFunction = this.componentDescriptor.converter;
			}
		}
	}
}