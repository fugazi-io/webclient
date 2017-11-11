import * as utils from "../core/utils";
import * as coreTypes from "../core/types";
import * as components from "./components";
import * as registry from "./registry";
import * as descriptor from "./components.descriptor";

const anonymousNameSettings: utils.GenerateIdParameters = {
	prefix: "anonymous:",
	min: 5,
	max: 10
};

export class Exception extends coreTypes.Exception {}

export enum State {
	None,
	Initiated,
	Building,
	Built,
	Associating,
	Complete,
	Failed
}

export interface Builder<C extends components.Component> {
	getParent(): Builder<components.Component>;
	getState(): State;
	getPath(): components.Path;
	getName(): string;
	getTitle(): string;
	getDescription(): string;
	getComponent(): C;
	build(): Promise<C>;
	associate(): void;
	resolve<C2 extends components.Component>(type: components.ComponentType, name: string): C2;
}

export function createAnonymousDescriptor<C extends components.Component>(type: components.ComponentType): descriptor.Descriptor {
	return {
		name: utils.generateId(anonymousNameSettings),
		title: "anonymous " + components.ComponentType[type]
	};
}

export abstract class BaseBuilder<C extends components.Component, D extends descriptor.Descriptor> implements components.ComponentResolver, Builder<C> {
	private id: string;
	private path: components.Path;
	private name: string;
	private title: string;
	private manual: components.Manual;
	private description: string;

	private state: State;
	private buildCalled: boolean;
	private descriptorState: "none" | "ready" | "invalid";

	private innerBuildersCount: number;
	private innerBuildersCompletedCount: number;
	private componentConstructor: { new (): C };

	protected loader: descriptor.Loader<D>;
	protected component: C;
	protected parent: Builder<components.Component>;
	protected componentDescriptor: D;
	protected future: coreTypes.Future<C>;

	constructor(componentConstructor: { new (): C }, loader: descriptor.Loader<D>, parent?: Builder<components.Component>) {
		this.id = utils.generateId();
		this.loader = loader;
		this.state = State.None;
		this.buildCalled = false;
		this.parent = parent || null;
		this.descriptorState = "none";
		this.componentConstructor = componentConstructor;
		this.future = new coreTypes.Future<C>();

		this.loader.then(this.descriptorReady.bind(this)).catch(this.descriptorInvalid.bind(this));
	}

	public getParent(): Builder<components.Component> {
		return this.parent;
	}

	public getState(): State {
		return this.state;
	}

	public getPath(): components.Path {
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

	public resolve<C2 extends components.Component>(type: components.ComponentType, name: string): C2 {
		return this.parent != null ? this.parent.resolve<C2>(type, name) : <C2> registry.get(type, name);
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
		this.title = coreTypes.isNothing(componentDescriptor.title) ? componentDescriptor.name : componentDescriptor.title;
		this.description = coreTypes.isNothing(componentDescriptor.description) ? "" : componentDescriptor.description;
		this.manual = componentDescriptor.manual;

		this.path = this.parent ? this.parent.getPath().child(this.name) : new components.Path(this.name);

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

	private descriptorInvalid(error: coreTypes.Exception): void {
		this.state = State.Failed;
		this.descriptorState = "invalid";
		this.future.reject(error);
	}

	private instantiateComponent() {
		this.component = new this.componentConstructor();

		(<any> this.component).path = this.path;
		(<any> this.component).name = this.name;
		(<any> this.component).title = this.title;
		(<any> this.component).manual = this.manual;
		(<any> this.component).description = this.description;
	}
}
