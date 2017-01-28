/// <reference path="../core/types.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="../core/net.ts" />
/// <reference path="../app/application.ts" />
/// <reference path="registry.ts" />

/**
 * Created by nitzan on 12/03/2016.
 */

namespace fugazi.components {
	export type ComponentTypeName = "module" | "constraint" | "converter" | "command" | "type";

	export enum ComponentType {
		Type,
		Module,
		Command,
		Converter,
		Constraint,
		SyntaxRule
	}

	export function typeFromName(name: ComponentTypeName): ComponentType {
		switch (name) {
			case "type":
				return ComponentType.Type;
			case "module":
				return ComponentType.Module;
			case "command":
				return ComponentType.Command;
			case "converter":
				return ComponentType.Converter;
			case "constraint":
				return ComponentType.Constraint;

		}
	}

	export class Path {
		private names: string[];

		constructor();
		constructor(path: string);
		constructor(path: string[], child?: string);
		constructor(path?: string | string[], child?: string) {
			if (!path) {
				this.names = [];
			} else if (path instanceof Array) {
				this.names = path.clone();

				if (child) {
					this.names.push(child);
				}
			} else {
				this.names = path.split(".");
			}
		}

		get length(): number {
			return this.names.length;
		}

		public at(index: number): string {
			return this.names[index];
		}

		public first(): string {
			return this.names.first();
		}

		public last(): string {
			return this.names.last();
		}

		public child(name: string): Path {
			return new Path(this.names, name);
		}

		public parent(): Path {
			let parent = this.names.clone();
			parent.pop();
			return new Path(parent);
		}

		public startsWith(prefix: Path): boolean {
			return prefix.names.every((name, index) => this.names[index] === name);
		}

		public clone(): Path {
			return new Path(this.names.clone());
		}

		public equals(other: Path): boolean {
			return other.length === this.length && this.startsWith(other);
		}

		public forEach(callbackfn: (value: string, index: number) => void, thisArg?: any) {
			this.names.forEach(callbackfn, thisArg);
		}

		public toString(): string {
			return this.names.join(".");
		}
	}

	export class Component {
		protected path: Path;
		protected type: ComponentType;
		protected parent: Component;
		protected name: string;
		protected title: string;
		protected description: string;

		public constructor(type: ComponentType) {
			this.type = type;
		}

		public getComponentType(): ComponentType {
			return this.type;
		}

		public getName(): string {
			return this.name;
		}

		public getPath(): Path {
			return this.path;
		}

		public getTitle(): string {
			return this.title;
		}

		public getDescription(): string {
			return this.description;
		}

		public getParent(): Component {
			return this.parent || null;
		}

		public toString(): string {
			return this.getName();
		}
	}

	export namespace descriptor {
		export interface Descriptor {
			name: string;
			title?: string;
			description?: string;
			componentConstructor?: { new (): Component };
		}

		export interface Loader<T extends Descriptor> {
			then(fn: (aDescriptor: T) => void): Loader<T>;
			catch(fn: (error: fugazi.Exception) => void): Loader<T>;
			getUrl(): net.Url;
			getUrlFor(path: string): net.Url;
		}

		export abstract class BaseLoader<T extends Descriptor> implements Loader<T> {
			protected baseUrl: net.Url;

			constructor(baseUrl?: net.Url) {
				this.baseUrl = baseUrl || app.location.currentScript();
			}

			public getUrl(): net.Url {
				return this.baseUrl == null ? null : this.baseUrl.clone();
			}

			public getUrlFor(path: string): net.Url {
				return this.baseUrl == null ? null : new net.Url(path, this.baseUrl);
			}

			public abstract then(fn: (aDescriptor: T) => void): Loader<T>;
			public abstract catch(fn: (error: fugazi.Exception) => void): Loader<T>;
		}

		export class ExistingLoader<T extends Descriptor> extends BaseLoader<T> {
			private aDescriptor: T;

			constructor(aDescriptor: T, baseUrl?: net.Url) {
				super(baseUrl);
				this.aDescriptor = aDescriptor;
			}

			then(fn: (aDescriptor: T) => void | T): Loader<T> {
				let result = fn(this.aDescriptor);

				if (fugazi.isPlainObject(result) && fugazi.is((<T> result).name, String)) {
					this.aDescriptor = <T> result;
				}

				return this;
			}

			catch(fn: (error: fugazi.Exception) => void): Loader<T> {
				return this;
			}
		}

		export class FailedLoader extends BaseLoader<Descriptor> {
			private error: fugazi.Exception;

			constructor(error: fugazi.Exception, baseUrl?: net.Url) {
				super(baseUrl);
				this.error = error;
			}

			then(fn: (aDescriptor: Descriptor) => void): Loader<Descriptor> {
				return this;
			}

			catch(fn: (error: fugazi.Exception) => void): Loader<Descriptor> {
				fn(this.error);
				return this;
			}
		}
	}

	export interface ComponentResolver {
		resolve<T extends Component>(type: ComponentType, name: string): T;
	}

	export namespace builder {
		var anonymousNameSettings: utils.GenerateIdParameters = {
				prefix: "anonymous:",
				min: 5,
				max: 10
			};

		export class Exception extends fugazi.Exception {}

		export enum State {
			None,
			Initiated,
			Building,
			Built,
			Associating,
			Complete,
			Failed
		}

		export interface Builder<C extends Component> {
			getParent(): Builder<Component>;
			getState(): State;
			getPath(): Path;
			getName(): string;
			getTitle(): string;
			getDescription(): string;
			getComponent(): C;
			build(): Promise<C>;
			associate(): void;
			resolve<C2 extends Component>(type: ComponentType, name: string): C2;
		}

		export function createAnonymousDescriptor<C extends Component>(type: ComponentType): descriptor.Descriptor {
			return {
					name: utils.generateId(anonymousNameSettings),
					title: "anonymous " + ComponentType[type]
				};
		}

		export abstract class BaseBuilder<C extends Component, D extends descriptor.Descriptor> implements ComponentResolver, Builder<C> {
			private id: string;
			private path: Path;
			private name: string;
			private title: string;
			private description: string;

			private state: State;
			private buildCalled: boolean;
			private descriptorState: "none" | "ready" | "invalid";

			private innerBuildersCount: number;
			private innerBuildersCompletedCount: number;
			private componentConstructor: { new (): C };

			protected loader: descriptor.Loader<D>;
			protected component: C;
			protected parent: Builder<Component>;
			protected componentDescriptor: D;
			protected future: fugazi.Future<C>;

			constructor(componentConstructor: { new (): C }, loader: descriptor.Loader<D>, parent?: Builder<Component>) {
				this.id = utils.generateId();
				this.loader = loader;
				this.state = State.None;
				this.buildCalled = false;
				this.parent = parent || null;
				this.descriptorState = "none";
				this.componentConstructor = componentConstructor;
				this.future = new fugazi.Future<C>();

				this.loader.then(this.descriptorReady.bind(this)).catch(this.descriptorInvalid.bind(this));
			}

			public getParent(): Builder<Component> {
				return this.parent;
			}

			public getState(): State {
				return this.state;
			}

			public getPath(): Path {
				return this.path;
			}

			public getName(): string {
				return this.name;
			}

			public getTitle(): string {
				return this.title;
			}

			public getDescription(): string {
				return this.description;
			}

			public getComponent(): C {
				return this.component;
			}

			public build(): Promise<C> {
				if (this.state === State.None) {
					this.buildCalled = true;
				} else if (this.state !== State.Initiated) {
					throw new Exception(`build() was called on Builder with state ${ State[this.state] }`);
				} else {
					this.state = State.Building;

					this.instantiateComponent();

					try {
						this.concreteBuild();
						this.state = State.Built;
					} catch (e) {
						this.state = State.Failed;
						this.future.reject(e);
					}
				}

				return this.future.asPromise();
			}

			public associate(): void {
				if (this.state !== State.Built) {
					throw new Exception(`associate() was called on Builder with state ${ State[this.state] }`);
				}

				this.state = State.Associating;

				if (this.parent !== null) {
					(<any> this.component).parent = (<BaseBuilder<C, D>> this.parent).component;
				}

				try {
					this.concreteAssociate();
					this.state = State.Complete;
				} catch (e) {
					this.state = State.Failed;
					throw e;
				}
			}

			public resolve<C2 extends Component>(type: ComponentType, name: string): C2 {
				return this.parent != null ? this.parent.resolve<C2>(type, name) : <C2> components.registry.get(type, name);
			}

			protected hasInnerBuilders(): boolean {
				return this.innerBuildersCount > 0;
			}

			protected innerBuilderCreated(): void {
				this.innerBuildersCount++;
			}

			protected innerBuilderCompleted(): void {
				if (this.innerBuildersCount === ++this.innerBuildersCompletedCount) {
					this.future.resolve(this.component);
				}
			}

			protected abstract concreteBuild(): void;
			protected abstract concreteAssociate(): void;
			protected abstract onDescriptorReady(): void;

			private descriptorReady(componentDescriptor: D): void {
				this.state = State.Initiated;
				this.descriptorState = "ready";

				this.componentDescriptor = componentDescriptor;
				this.name = componentDescriptor.name;
				this.title = fugazi.isNothing(componentDescriptor.title) ? componentDescriptor.name : componentDescriptor.title;
				this.description = fugazi.isNothing(componentDescriptor.description) ? "" : componentDescriptor.description;

				this.path = this.parent ? this.parent.getPath().child(this.name) : new Path(this.name);

				this.innerBuildersCount = 0;
				this.innerBuildersCompletedCount = 0;
				if (componentDescriptor.componentConstructor) {
					this.componentConstructor = componentDescriptor.componentConstructor as { new (): C };
				}

				this.onDescriptorReady();

				if (this.buildCalled) {
					this.build();
				}
			}

			private descriptorInvalid(error: fugazi.Exception): void {
				this.state = State.Failed;
				this.descriptorState = "invalid";
				this.future.reject(error);
			}

			private instantiateComponent() {
				this.component = new this.componentConstructor();

				(<any> this.component).path = this.path;
				(<any> this.component).name = this.name;
				(<any> this.component).title = this.title;
				(<any> this.component).description = this.description;
			}
		}
	}
}
