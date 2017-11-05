import * as collections from "../core/types.collections";
import * as coreTypes from "../core/types";
import * as net from "../core/net";
import * as components from "./components";
import * as componentsBuilder from "./components.builder";
import * as constraintsDescriptor from "./constraints.descriptor";
import * as constraintsBuilder from "./constraints.builder";
import * as convertersDescriptor from "./converters.descriptor";
import * as componentsDescriptor from "./components.descriptor";
import * as commandsDescriptor from "./commands.descriptor";
import * as commandsBuilder from "./commands.builder";
import * as convertersBuilder from "./converters.builder";
import * as types from "./types";
import * as constraints from "./constraints";
import * as converters from "./converters";
import * as commands from "./commands";
import * as modules from "./modules";
import * as descriptor from "./modules.descriptor";

import * as typesDescriptor from "./types.descriptor";
import * as typesBuilder from "./types.builder";

function breakDescriptorWithPath(moduleDescriptor: descriptor.Descriptor) {
	let result: descriptor.Descriptor,
		path: string[] = moduleDescriptor.name.split(".");

	if (path.length === 1) {
		result = moduleDescriptor;
	} else {
		let first = path.remove(0),
			tail = path.join("."),
			innerModuleDescriptor = {} as descriptor.Descriptor;

		Object.keys(moduleDescriptor).forEach(key => innerModuleDescriptor[key] = moduleDescriptor[key]);
		innerModuleDescriptor.name = tail;

		result = {
			name: first,
			modules: [breakDescriptorWithPath(innerModuleDescriptor)]
		}
	}

	return result;
}

class PreprocessPipeline implements PreprocessorObject {
	private preprocessors: Preprocessor[];

	constructor() {
		this.preprocessors = [];
	}

	add(preprocessor: Preprocessor): this {
		this.preprocessors.push(preprocessor);
		return this;
	}

	preprocess(descriptor: descriptor.Descriptor): Promise<descriptor.Descriptor> {
		let promise = this.preprocessItem(0, descriptor);

		for (let i = 1; i < this.preprocessors.length; i++) {
			promise = promise.then(result => this.preprocessItem(i, result));
		}

		return promise;
	}

	private preprocessItem(index: number, descriptor: descriptor.Descriptor): Promise<descriptor.Descriptor> {
		const preprocessor = this.preprocessors[index];
		return isPreprocessorFunction(preprocessor) ? preprocessor(descriptor) : preprocessor.preprocess(descriptor);
	}
}

export type PreprocessorFunction = (descriptor: descriptor.Descriptor) => Promise<descriptor.Descriptor>;
function isPreprocessorFunction(preprocessor: Preprocessor): preprocessor is PreprocessorFunction {
	return typeof preprocessor === "function";
}

export interface PreprocessorObject {
	preprocess(descriptor: descriptor.Descriptor): Promise<descriptor.Descriptor>;
}

export type Preprocessor = PreprocessorFunction | PreprocessorObject;

const preprocessors = {
	AddBase: (descriptor: descriptor.Descriptor) => Promise.resolve(Object.assign({}, descriptor )),
	/*Prompter: {
		preprocess: function (descriptor: descriptor.Descriptor): Promise<descriptor.Descriptor> {
			descriptor.preprocess && descriptor.preprocess.prompt && Object.entries(descriptor.preprocess.prompt).forEach((name, promptInfo) => {

			});
		}
	}*/
} as { [id: string]: Preprocessor };

export function create(url: net.Url): componentsBuilder.Builder<modules.Module>;
export function create(moduleDescriptor: descriptor.Descriptor, parent?: componentsBuilder.Builder<components.Component>): componentsBuilder.Builder<modules.Module>;
export function create(moduleDescriptor: net.Url | descriptor.Descriptor, parent?): componentsBuilder.Builder<modules.Module> {
	let loader: componentsDescriptor.Loader<descriptor.Descriptor>;

	if (moduleDescriptor instanceof net.Url) {
		if (moduleDescriptor.pathname.endsWith(".js")) {
			loader = new descriptor.ScriptLoader(moduleDescriptor);
		} else if (moduleDescriptor.pathname.endsWith(".json")) {
			loader = new descriptor.HttpLoader(moduleDescriptor);
		} else {
			throw new coreTypes.Exception("can only load .js or .json urls");
		}
	} else {
		if (parent) {
			loader = new componentsDescriptor.ExistingLoader(moduleDescriptor, (<any> parent).loader.getUrl());
		} else {
			loader = new componentsDescriptor.ExistingLoader(moduleDescriptor);
		}
	}

	loader.then(aDescriptor => breakDescriptorWithPath(aDescriptor));
	return new Builder(loader, parent);
}

interface RemoteBuilderInfo {
	path: components.Path;
	builder: Builder;
	name?: string;
}

export class Builder<R extends modules.Remote = modules.RemotePath> extends componentsBuilder.BaseBuilder<modules.Module, descriptor.Descriptor> {
	protected innerModuleBuilders: collections.FugaziMap<componentsBuilder.Builder<modules.Module>>;
	protected innerTypesBuilders: collections.FugaziMap<componentsBuilder.Builder<types.Type>>;
	protected innerCommandsBuilders: collections.FugaziMap<componentsBuilder.Builder<commands.Command>>;
	protected innerConvertersBuilders: collections.FugaziMap<componentsBuilder.Builder<converters.Converter>>;
	protected innerConstraintBuilders: collections.FugaziMap<componentsBuilder.Builder<constraints.Constraint>>;

	private innerModuleRemoteBuilders: Array<RemoteBuilderInfo>;
	private innerTypeModuleRemoteBuilders: Array<RemoteBuilderInfo>;
	private innerCommandModuleRemoteBuilders: Array<RemoteBuilderInfo>;
	private innerConvertersModuleRemoteBuilders: Array<RemoteBuilderInfo>;
	private innerConstraintModuleRemoteBuilders: Array<RemoteBuilderInfo>;

	protected params: modules.Parameters;
	protected remote: R;

	public constructor(loader: componentsDescriptor.Loader<descriptor.Descriptor>, parent?: componentsBuilder.Builder<components.Component>) {
		super(modules.Module, loader, parent);
	}

	public resolve<C2 extends components.Component>(type: components.ComponentType, name: string): C2 {
		var path: string[] = name.split("."),
			collection: collections.FugaziMap<componentsBuilder.Builder<components.Component>> = null;

		if (path.length > 1) {
			if (this.getName() === path.first()) {
				name = name.substring(name.indexOf(".") + 1);
			} else if (this.innerModuleBuilders.has(path.first())) {
				return this.innerModuleBuilders.get(path.first()).resolve<C2>(type, name.substring(name.indexOf(".") + 1));
			}
		}

		switch (type) {
			case components.ComponentType.Type:
				collection = this.innerTypesBuilders;
				break;

			case components.ComponentType.Module:
				collection = this.innerModuleBuilders;
				break;

			case components.ComponentType.Command:
				collection = this.innerCommandsBuilders;
				break;

			case components.ComponentType.Converter:
				collection = this.innerConvertersBuilders;
				break;

			case components.ComponentType.Constraint:
				collection = this.innerConstraintBuilders;
				break;
		}

		if (collection !== null && collection.has(name)) {
			return <C2> collection.get(name).getComponent();
		}

		return super.resolve<C2>(type, name);
	}

	public getBasePath() {
		return this.getParent() ? (this.getParent() as Builder).getBasePath() : new components.Path(this.componentDescriptor.name);
	}

	protected onDescriptorReady(): void {
		this.createParameters();

		this.innerModuleRemoteBuilders = [];
		this.innerTypeModuleRemoteBuilders = [];
		this.innerCommandModuleRemoteBuilders = [];
		this.innerConvertersModuleRemoteBuilders = [];
		this.innerConstraintModuleRemoteBuilders = [];

		this.innerModuleBuilders = collections.map<componentsBuilder.Builder<modules.Module>>();
		this.innerTypesBuilders = collections.map<componentsBuilder.Builder<types.Type>>();
		this.innerCommandsBuilders = collections.map<componentsBuilder.Builder<commands.Command>>();
		this.innerConvertersBuilders = collections.map<componentsBuilder.Builder<converters.Converter>>();
		this.innerConstraintBuilders = collections.map<componentsBuilder.Builder<constraints.Constraint>>();

		if (!coreTypes.isNothing(this.componentDescriptor.modules)) {
			this.createInnerModuleBuilders();
		}

		if (!coreTypes.isNothing(this.componentDescriptor.constraints)) {
			this.createInnerConstraintBuilders();
		}

		if (!coreTypes.isNothing(this.componentDescriptor.types)) {
			this.createInnerTypeBuilders();
		}

		if (!coreTypes.isNothing(this.componentDescriptor.commands)) {
			this.createInnerCommandBuilders();
		}

		if (!coreTypes.isNothing(this.componentDescriptor.converters)) {
			this.createInnerConvertersBuilders();
		}

		if ((<descriptor.Descriptor> this.componentDescriptor).remote) {
			const remote = <descriptor.RemoteDescriptor>(<descriptor.Descriptor> this.componentDescriptor).remote;

			this.handleRemoteDescriptor(remote);
		}
	}

	protected concreteBuild(): void {
		let innerBuilders = <Array<componentsBuilder.Builder<components.Component>>> [].concat(this.innerModuleBuilders.values())
			.concat(this.innerCommandsBuilders.values())
			.concat(this.innerConstraintBuilders.values())
			.concat(this.innerTypesBuilders.values())
			.concat(this.innerConvertersBuilders.values());

		if (innerBuilders.length > 0) {
			innerBuilders.forEach(componentBuilder => {
				componentBuilder.build().then(this.innerBuilderCompleted.bind(this), this.future.reject);
				this.innerBuilderCreated();
			});
		} else if (this.component) {
			this.future.resolve(this.component);
		}

		this.innerModuleRemoteBuilders.forEach(pair => {
			pair.builder.build().then(this.remoteModuleBuilt.bind(this, pair, "module"), this.future.reject);
			this.innerBuilderCreated();
		});

		this.innerTypeModuleRemoteBuilders.forEach(pair => {
			pair.builder.build().then(this.remoteModuleBuilt.bind(this, pair, "type"), this.future.reject);
			this.innerBuilderCreated();
		});

		this.innerCommandModuleRemoteBuilders.forEach(pair => {
			pair.builder.build().then(this.remoteModuleBuilt.bind(this, pair, "command"), this.future.reject);
			this.innerBuilderCreated();
		});

		this.innerConvertersModuleRemoteBuilders.forEach(pair => {
			pair.builder.build().then(this.remoteModuleBuilt.bind(this, pair, "converter"), this.future.reject);
			this.innerBuilderCreated();
		});

		this.innerConstraintModuleRemoteBuilders.forEach(pair => {
			pair.builder.build().then(this.remoteModuleBuilt.bind(this, pair, "constraint"), this.future.reject);
			this.innerBuilderCreated();
		});
	}

	protected concreteAssociate(): void {
		(this.component as any).remote = this.remote;
		(this.component as any).params = this.params;

		this.innerModuleBuilders.forEach((moduleBuilder: Builder) => {
			if (modules.isRemotePath(moduleBuilder.remote)) {
				(moduleBuilder.remote as any)._parent = this.remote;
			}
			moduleBuilder.associate();
			(<any> this).component.modules.set(moduleBuilder.getName(), moduleBuilder.getComponent());
		});

		this.innerConstraintBuilders.forEach(function (constraintBuilder: componentsBuilder.Builder<constraints.Constraint>): void {
			constraintBuilder.associate();
			(<any> this).component.constraints.set(constraintBuilder.getName(), constraintBuilder.getComponent());
		}.bind(this));

		this.innerTypesBuilders.forEach(function (typeBuilder: componentsBuilder.Builder<types.Type>): void {
			typeBuilder.associate();
			(<any> this).component.types.set(typeBuilder.getName(), typeBuilder.getComponent());
		}.bind(this));

		this.innerCommandsBuilders.forEach(function (commandBuilder: componentsBuilder.Builder<commands.Command>): void {
			commandBuilder.associate();
			(<any> this).component.commands.set(commandBuilder.getName(), commandBuilder.getComponent());
		}.bind(this));

		this.innerConvertersBuilders.forEach(function (converterBuilder: componentsBuilder.Builder<converters.Converter>): void {
			converterBuilder.associate();
			(<any> this).component.converters.set(converterBuilder.getName(), converterBuilder.getComponent());
		}.bind(this));
	}

	private createParameters() {
		this.params = new modules.Parameters();

		if (this.componentDescriptor.lookup) {
			Object.keys(this.componentDescriptor.lookup).forEach(name => {
				(this.params as any).lookup.set(name, modules.createLookup(this.componentDescriptor.lookup[name]));
			});
		}
	}

	private createInnerModuleBuilders() {
		if (coreTypes.is(this.componentDescriptor.modules, Array)) {
			(<descriptor.InnerModulesArrayCollection> this.componentDescriptor.modules).forEach(current => {
				if (typeof current === "string") { // url
					this.innerModuleRemoteBuilders.push({
						path: this.getPath().clone(),
						builder: <Builder> create(this.createInnerUrl(current))
					});
				} else { // descriptor
					this.innerModuleBuilders.set(current.name, create(current, this));
				}
			});
		} else if (coreTypes.isPlainObject(this.componentDescriptor.modules)) {
			Object.keys(this.componentDescriptor.modules).forEach(moduleName => {
				let moduleDescriptor = this.componentDescriptor.modules[moduleName];

				if (typeof moduleDescriptor === "string") { // url
					this.innerModuleRemoteBuilders.push({
						name: moduleName,
						path: this.getPath().clone(),
						builder: <Builder> create(this.createInnerUrl(moduleDescriptor))
					});
				} else { // descriptor
					moduleDescriptor.name = moduleName;
					this.innerModuleBuilders.set(moduleName, create(moduleDescriptor, this));
				}
			});
		} else {
			throw new componentsBuilder.Exception("can only build inner modules from array or object collections");
		}
	}

	private createInnerCommandBuilders() {
		if (typeof this.componentDescriptor.commands === "string") { // url
			this.innerCommandModuleRemoteBuilders.push({
				path: this.getPath().clone(),
				builder: <Builder> create(this.createInnerUrl(<string> this.componentDescriptor.commands))
			});
		} else if (this.componentDescriptor.commands instanceof Array) {
			(<descriptor.InnerComponentsArrayCollection<commandsDescriptor.Descriptor>> this.componentDescriptor.commands).forEach(current => {
				if (typeof current === "string") { // url
					this.innerCommandModuleRemoteBuilders.push({
						path: this.getPath().clone(),
						builder: <Builder> create(this.createInnerUrl(current))
					});
				} else { // descriptor
					this.innerCommandsBuilders.set(current.name, commandsBuilder.create(current, this));
				}
			});
		} else if (coreTypes.isPlainObject(this.componentDescriptor.commands)) {
			Object.keys(this.componentDescriptor.commands).forEach(commandName => {
				let commandDescriptor = this.componentDescriptor.commands[commandName];

				if (typeof commandDescriptor === "string") { // url
					this.innerCommandModuleRemoteBuilders.push({
						name: commandName,
						path: this.getPath().clone(),
						builder: <Builder> create(this.createInnerUrl(commandDescriptor))
					});
				} else { // descriptor
					commandDescriptor.name = commandName;
					this.innerCommandsBuilders.set(commandName, commandsBuilder.create(commandDescriptor, this));
				}
			});
		} else {
			throw new componentsBuilder.Exception("can only build commands from url string, array or object collections");
		}
	}

	private createInnerConvertersBuilders() {
		if (typeof this.componentDescriptor.converters === "string") { // url
			this.innerConvertersModuleRemoteBuilders.push({
				path: this.getPath().clone(),
				builder: <Builder> create(this.createInnerUrl(<string> this.componentDescriptor.converters))
			});
		} else if (this.componentDescriptor.converters instanceof Array) {
			(<descriptor.InnerComponentsArrayCollection<convertersDescriptor.Descriptor>> this.componentDescriptor.converters).forEach(current => {
				if (typeof current === "string") { // url
					this.innerConvertersModuleRemoteBuilders.push({
						path: this.getPath().clone(),
						builder: <Builder> create(this.createInnerUrl(current))
					});
				} else { // descriptor
					this.innerConvertersBuilders.set(current.name, convertersBuilder.create(current, this));
				}
			});
		} else if (coreTypes.isPlainObject(this.componentDescriptor.converters)) {
			Object.keys(this.componentDescriptor.converters).forEach(converterName => {
				let converterDescriptor = this.componentDescriptor.converters[converterName];

				if (typeof converterDescriptor === "string") { // url
					this.innerConvertersModuleRemoteBuilders.push({
						name: converterName,
						path: this.getPath().clone(),
						builder: <Builder> create(this.createInnerUrl(converterDescriptor))
					});
				} else { // descriptor
					converterDescriptor.name = converterName;
					this.innerConvertersBuilders.set(converterName, convertersBuilder.create(converterDescriptor, this));
				}
			});
		} else {
			throw new componentsBuilder.Exception("can only build converters from url string, array or object collections");
		}
	}

	private createInnerConstraintBuilders() {
		if (typeof this.componentDescriptor.constraints === "string") { // url
			this.innerConstraintModuleRemoteBuilders.push({
				path: this.getPath().clone(),
				builder: <Builder> create(this.createInnerUrl(<string> this.componentDescriptor.constraints))
			});
		} else if (this.componentDescriptor.constraints instanceof Array) {
			(<descriptor.InnerComponentsArrayCollection<constraintsDescriptor.Descriptor>> this.componentDescriptor.constraints).forEach(current => {
				if (typeof current === "string") { // url
					this.innerConstraintModuleRemoteBuilders.push({
						path: this.getPath().clone(),
						builder: <Builder> create(this.createInnerUrl(current))
					});
				} else { // descriptor
					this.innerConstraintBuilders.set(current.name, constraintsBuilder.create(current, this));
				}
			});
		} else if (coreTypes.isPlainObject(this.componentDescriptor.constraints)) {
			Object.keys(this.componentDescriptor.constraints).forEach(constraintName => {
				let constraintDescriptor = this.componentDescriptor.constraints[constraintName];

				if (typeof constraintDescriptor === "string") { // url
					this.innerConstraintModuleRemoteBuilders.push({
						name: constraintName,
						path: this.getPath().clone(),
						builder: <Builder> create(this.createInnerUrl(constraintDescriptor))
					});
				} else { // descriptor
					constraintDescriptor.name = constraintName;
					this.innerConstraintBuilders.set(constraintName, constraintsBuilder.create(constraintDescriptor, this));
				}
			});
		} else {
			throw new componentsBuilder.Exception("can only build constraints from url string, array or object collections");
		}
	}

	private createInnerTypeBuilders() {
		if (typeof this.componentDescriptor.types === "string") { // url
			this.innerTypeModuleRemoteBuilders.push({
				path: this.getPath().clone(),
				builder: <Builder> create(this.createInnerUrl(<string> this.componentDescriptor.types))
			});
		} else if (this.componentDescriptor.types instanceof Array) {
			(<descriptor.InnerComponentsArrayCollection<typesDescriptor.Descriptor>> this.componentDescriptor.types).forEach(current => {
				if (typeof current === "string") { // url
					this.innerTypeModuleRemoteBuilders.push({
						path: this.getPath().clone(),
						builder: <Builder> create(this.createInnerUrl(current))
					});
				} else { // descriptor
					this.innerTypesBuilders.set(current.name, typesBuilder.create(current, this));
				}
			});
		} else if (coreTypes.isPlainObject(this.componentDescriptor.types)) {
			Object.keys(this.componentDescriptor.types).forEach(typeName => {
				let typeDescriptor = this.componentDescriptor.types[typeName];

				if (typeof typeDescriptor === "string") { // url
					this.innerTypeModuleRemoteBuilders.push({
						name: typeName,
						path: this.getPath().clone(),
						builder: <Builder> create(this.createInnerUrl(typeDescriptor))
					});
				} else { // descriptor
					typeDescriptor.name = typeName;
					this.innerTypesBuilders.set(typeName, typesBuilder.create(typeDescriptor, this));
				}
			});
		} else {
			throw new componentsBuilder.Exception("can only build constraints from url string, array or object collections");
		}
	}

	private createInnerUrl(path: string): net.Url {
		return this.loader.getUrlFor(path);
	}

	private remoteModuleBuilt(info: RemoteBuilderInfo, collectionType: components.ComponentTypeName): void {
		let newBuilder = info.builder;

		for (let i = 1; newBuilder != null && i < info.path.length; i++) {
			newBuilder = newBuilder.innerModuleBuilders.values()[0] as Builder;
		}

		if (newBuilder == null) {
			throw new componentsBuilder.Exception(`remote module path doesn't match parent path 1`);
		}

		switch (collectionType) {
			case "module":
				newBuilder = <Builder> newBuilder.innerModuleBuilders.values()[0];
				if (newBuilder == null) {
					throw new componentsBuilder.Exception(`remote module path doesn't match parent path 2`);
				}

				newBuilder.parent = this;
				this.innerModuleBuilders.set(info.name || info.builder.getName(), newBuilder);

				break;

			case "command":
				newBuilder.innerCommandsBuilders.values().forEach(commandBuilder => {
					(<any> commandBuilder).parent = this;
					this.innerCommandsBuilders.set(commandBuilder.getName(), commandBuilder);
				});

				break;

			case "type":
				newBuilder.innerTypesBuilders.values().forEach(typeBuilder => {
					(<any> typeBuilder).parent = this;
					this.innerTypesBuilders.set(typeBuilder.getName(), typeBuilder);
				});

				break;

			case "converter":
				newBuilder.innerConvertersBuilders.values().forEach(converterBuilder => {
					(<any> converterBuilder).parent = this;
					this.innerConvertersBuilders.set(converterBuilder.getName(), converterBuilder);
				});

				break;

			case "constraint":
				newBuilder.innerConstraintBuilders.values().forEach(constraintBuilder => {
					(<any> constraintBuilder).parent = this;
					this.innerConstraintBuilders.set(constraintBuilder.getName(), constraintBuilder);
				});

				break;
		}

		this.innerBuilderCompleted();
	}

	protected handleRemoteDescriptor(remote: descriptor.RemoteDescriptor) {
		this.remote = new modules.RemotePath((remote as descriptor.RelativeRemoteDescriptor).path) as any as R;
	}
}

export class RootBuilder extends Builder<modules.RemoteSource> {
	private pipeline: PreprocessPipeline;

	public constructor(loader: componentsDescriptor.Loader<descriptor.Descriptor>, parent?: componentsBuilder.Builder<components.Component>) {
		super(loader, parent);
		this.pipeline = new PreprocessPipeline();
	}

	protected onDescriptorReady(): void {

	}

	protected handleRemoteDescriptor(remote: descriptor.RemoteDescriptor) {
		if (this.getParent() != null &&
			this.getParent().getComponent() != null &&
			(<modules.Module> this.getParent().getComponent()).isRemote()) {

			throw new componentsBuilder.Exception(
				`Contradicting 'remote' descriptions been detected on '${this.getPath()}' 
						and its parent module '${this.getParent().getPath()}'`);
		}

		this.remote = new modules.RemoteSource(remote as descriptor.SourceRemoteDescriptor);
		const loginCommandDescriptor = (this.remote as modules.RemoteSource).loginCommandDescriptor();
		if (loginCommandDescriptor != null && Object.keys(loginCommandDescriptor).length > 0) {
			this.innerCommandsBuilders.set(loginCommandDescriptor.name, commandsBuilder.create(loginCommandDescriptor, this));
		}
	}
}
