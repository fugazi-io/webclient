import * as modules from "./modules";
import * as modulesBuilder from "./modules.builder";
import * as commands from "./commands";
import * as constants from "../app/constants";
import * as applicationBus from "../app/application.bus";
import * as semantics from "../app/semantics";
import * as components from "./components";
import * as converters from "./converters";
import * as constraints from "./constraints";
import * as types from "./types";
import * as coreTypes from "../core/types";
import * as net from "../core/net";
import * as logger from "../core/logger";
import * as collections from "../core/types.collections";

logger.init();

const index = collections.map<modules.Module>(),
	defaultConverters = collections.map<converters.Converter>();

export class ModuleAssociationException extends coreTypes.Exception {}

export const Events = {
	Ready: "ready"
};

export interface LoadProperties {
	augment?: boolean;
	url: string | net.Url;
}

export function load(props: LoadProperties): Promise<modules.Module> {
	let url: net.Url = props.url instanceof net.Url ? <net.Url> props.url : new net.Url(<string> props.url),
		future = new coreTypes.Future<modules.Module>(),
		moduleBuilder = modulesBuilder.create(url) as modulesBuilder.Builder;

	moduleBuilder.build()
		.then(wrapper => {
			const basePath = moduleBuilder.getBasePath();

			try {
				moduleBuilder.associate();

				let actualModule = wrapper;
				for (let i = 0; i < basePath.length - 1; i++) {
					actualModule = actualModule.getModule(basePath.at(i + 1));
				}

				if (!props.augment && has(components.ComponentType.Module, actualModule.getPath().toString())) {
					console.log(`already have module: "${ actualModule.getPath().toString() }"`);
					future.resolve(get(components.ComponentType.Module, actualModule.getPath().toString()) as modules.Module);
				} else {
					actualModule.loaded()
						.then(() => {
							addModule(wrapper);
							future.resolve(actualModule);
						})
						.catch(error => {
							future.reject(error);
						});
				}
			} catch (e) {
				// TODO: remove the module form the registry
				future.reject(e);
			}
		})
		.catch(future.reject.bind(future));

	return future.asPromise();
}

export function add(aModule: modules.Module): void {
	addModule(aModule);
}

export function has(type: components.ComponentType, pathString: string): boolean {
	return get(type, pathString) != null;
}

export function get<T extends components.Component>(type: components.ComponentType, pathString: string): T;
export function get(type: components.ComponentType, pathString: string): components.Component {
	let component,
		path = pathString.split(".");

	component = recursiveGet(type, path);

	if (component == null) {
		component = recursiveGet(type, (path.first() === "fugazi" ? ["io"] : ["io", "fugazi"]).concat(path));
	}

	if (component == null) {
		component = recursiveGet(type, ["io", "fugazi", "core"].concat(path));
	}

	return component;
}

export function getUnknown(pathString: string): components.Component | null {
	const path = pathString.split(".");

	if (!index.has(path[0])) {
		return null;
	}

	let current: modules.Module = index.get(path[0]);
	let i: number;
	for (i = 1; i < path.length - 1; i++) {
		if (!current.hasModule(path[i])) {
			return null;
		}

		current = current.getModule(path[i]);
	}

	if (current.hasModule(path[i])) {
		return current.getModule(path[i]);
	}

	if (current.hasCommand(path[i])) {
		return current.getCommand(path[i]);
	}

	return null;
}

export function findCommand(name: string): commands.Command[] {
	let commands = [] as commands.Command[];

	index.values().forEach(module => {
		let command = module.getCommand(name, true);
		if (command) {
			commands.push(command);
		}
	});

	return commands;
}

function recursiveGet(type: components.ComponentType, path: string[], parent?: modules.Module): components.Component {
	let name;

	if (path.length === 1) {
		if (!parent) {
			return type === components.ComponentType.Module ? index.get(path.first()) : null;
		}

		switch (type) {
			case components.ComponentType.Module:
				return parent.getModule(path.first());

			case components.ComponentType.Type:
				return parent.getType(path.first());

			case components.ComponentType.Constraint:
				return parent.getConstraint(path.first());

			case components.ComponentType.Command:
				return parent.getCommand(path.first());

			case components.ComponentType.Converter:
				return parent.getConverter(path.first());
		}
	}

	path = path.clone();
	name = path.remove(0);

	if (parent == null) {
		return index.has(name) ? recursiveGet(type, path, index.get(name)) : null;
	}

	return parent.hasModule(name) ? recursiveGet(type, path, parent.getModule(name)) : null;
}

export function getType(pathString: string): types.Type {
	return <types.Type> get(components.ComponentType.Type, pathString);
}

export function guessType(value: any): types.Type {
	if (value instanceof Array) {
		return getType("list");
	}

	if (coreTypes.isPlainObject(value) || value instanceof collections.FugaziMap) {
		return getType("map");
	}

	if (coreTypes.is(value, Number)) {
		return getType("number");
	}

	if (coreTypes.is(value, Boolean)) {
		return getType("boolean");
	}

	return typeof value === "string" ? getType("string") : getType("any");
}

export function guessTypeFromString(value: string): types.Type {
	if (!isNaN(parseFloat(value))) {
		return getType("number");
	}

	if (["true", "false"].includes(value.toLowerCase())) {
		return getType("boolean");
	}

	return getType("string");
}

export function getModule(pathString: string): modules.Module {
	return <modules.Module> get(components.ComponentType.Module, pathString);
}

export function getModules(parentPath?: string): modules.Module[] {
	if (parentPath) {
		let parentModule = getModule(parentPath);

		if (!parentModule) {
			throw new coreTypes.Exception("no such module " + parentPath);
		}

		return parentModule.getModules();
	}

	return index.values();
}

export function hasConverter(from: types.Type, to: types.Type): boolean {
	return defaultConverters.has(createConverterKey(from, to));
}

export function getConverter(pathString: string): converters.Converter;
export function getConverter(from: types.Type, to: types.Type): converters.Converter;
export function getConverter(...args: any[]): converters.Converter {
	if (typeof args[0] === "string") {
		return <converters.Converter> get(components.ComponentType.Converter, args[0]);
	}

	if (args.length == 2 && args[0] instanceof types.Type && args[1] instanceof types.Type) {
		return defaultConverters.get(createConverterKey(args[0], args[1]));
	}

	else return null;
}

function addComponent(parent: modules.Module, child: components.Component, type: components.ComponentType): void {
	switch (type) {
		case components.ComponentType.Module:
			parent.addModule(<modules.Module> child);
			break;

		case components.ComponentType.Type:
			parent.addType(<types.Type> child);
			break;

		case components.ComponentType.Constraint:
			parent.addConstraint(<constraints.Constraint> child);
			break;

		case components.ComponentType.Command:
			parent.addCommand(<commands.Command> child);
			break;

		case components.ComponentType.Converter:
			let key = createConverterKey(child as converters.Converter);

			parent.addConverter(child as converters.Converter);

			if (!defaultConverters.has(key)) {
				defaultConverters.set(key, child as converters.Converter)
			}
			break;
	}
}

function addModule(aModule: modules.Module): void {
	let handleConverter = (converter: converters.Converter) => {
		const key = createConverterKey(converter);
		if (!defaultConverters.has(key)) {
			defaultConverters.set(key, converter)
		}
	}

	if (!index.has(aModule.getName())) {
		let traverser = (newModule: modules.Module) => {
			newModule.forEachModule(innerModule => {
				traverser(innerModule);
			});

			newModule.forEachConverter(converter => {
				handleConverter(converter);
			});
		}

		index.set(aModule.getName(), aModule);
		traverser(aModule);
	} else {
		let transaction: Array<() => void> = [],
			traverser = function (newModule: modules.Module, parentModule: modules.Module): void {
				newModule.forEachType(type => {
					if (parentModule.hasType(type.getName())) {
						throw new coreTypes.Exception("type " + type.getPath() + " already exists");
					} else {
						transaction.push(addComponent.bind(null, parentModule, type, components.ComponentType.Type));
					}
				});

				newModule.forEachConstraint(constraint => {
					if (parentModule.hasConstraint(constraint.getName())) {
						throw new coreTypes.Exception("constraint " + constraint.getPath() + " already exists");
					} else {
						transaction.push(addComponent.bind(null, parentModule, constraint, components.ComponentType.Constraint));
					}
				});

				newModule.forEachCommand(command => {
					if (parentModule.hasCommand(command.getName())) {
						throw new coreTypes.Exception("command " + command.getPath() + " already exists");
					} else {
						transaction.push(addComponent.bind(null, parentModule, command, components.ComponentType.Command));
					}
				});

				newModule.forEachConverter(converter => {
					if (parentModule.hasConverter(converter.getName())) {
						throw new coreTypes.Exception("converter " + converter.getPath() + " already exists");
					} else {
						transaction.push(addComponent.bind(null, parentModule, converter, components.ComponentType.Converter));
					}
				});

				newModule.forEachModule(newInnerModule => {
					if (parentModule.hasModule(newInnerModule.getName())) {
						if (parentModule.isRemote() && newInnerModule.isRemote()) {
							throw new ModuleAssociationException(
								`module ${newInnerModule.getName()} cannot be added 
								to module ${parentModule.getName()} since they both contain 'remote' definition`);
						}
						traverser(newInnerModule, parentModule.getModule(newInnerModule.getName()));
					} else {
						transaction.push(addComponent.bind(null, parentModule, newInnerModule, components.ComponentType.Module));
					}
				})
			};

		traverser(aModule, index.get(aModule.getName())); // might throw
		transaction.forEach(fn => fn());
	}

	semantics.update(aModule);
}

function createConverterKey(converter: converters.Converter): string;
function createConverterKey(from: types.Type, to: types.Type): string;
function createConverterKey(...args: any[]): string {
	let to: types.Type,
		from: types.Type;

	if (args.length == 1 && args[0] instanceof converters.Converter) {
		to = args[0].getOutput();
		from = args[0].getInput();
	} else if (args.length == 2 && args[0] instanceof types.Type && args[1] instanceof types.Type) {
		to = args[1];
		from = args[0];
	} else {
		throw new coreTypes.Exception("can only create key from a converter or two types");
	}

	return `${ from.getPath().toString() }=>${ to.getPath().toString() }`;
}

function createCoreModule(parentPath: components.Path): modules.Module {
	let mapType: types.Type,
		listType: types.Type,
		stringType: types.Type,
		coreModule: modules.Module = new modules.Module();

	(<any> coreModule).name = "core";
	(<any> coreModule).title = "fugazi core module";
	(<any> coreModule).path = parentPath.child("core");

	// types
	coreModule.addType(new types.VoidType(coreModule));
	coreModule.addType(new types.AnyType(coreModule));

	coreModule.addType(new types.CoreType(
		coreModule,
		"boolean",
		"Boolean",
		value => coreTypes.is(value, Boolean)
	));

	coreModule.addType(new types.CoreType(
		coreModule,
		"number",
		"Number",
		value => coreTypes.is(value, Number)
	));

	stringType = new types.CoreType(
		coreModule,
		"string",
		"String",
		value => coreTypes.is(value, String)
	);
	coreModule.addType(stringType);

	listType = new types.CoreType(
		coreModule,
		"list",
		"List",
		value => coreTypes.is(value, Array)
	);
	coreModule.addType(listType);

	mapType = new types.CoreType(
		coreModule,
		"map",
		"Map",
		value => {
			return coreTypes.is(value, collections.FugaziMap) || coreTypes.isPlainObject(value);
		}
	);
	coreModule.addType(mapType);

	// constraints
	coreModule.addConstraint(new constraints.CoreConstraint(
		coreModule,
		"struct",
		"Struct",
		[mapType],
		["fields"],
		function (fields: collections.FugaziMap<types.Type>): constraints.BoundConstraintValidator {
			return function (map: collections.FugaziMap<any> | coreTypes.PlainObject<any>): boolean {
				if (map instanceof collections.FugaziMap) {
					return map.size() === fields.size() && map.keys().every(key => fields.has(key) && fields.get(key).validate(map.get(key)));
				} else {
					return Object.keys(map).length == fields.size() && Object.keys(map).every(key => fields.has(key) && fields.get(key).validate(map[key]));
				}
			}
		}
	));

	coreModule.addConstraint(new constraints.CoreConstraint(
		coreModule,
		"generics",
		"Generics",
		[listType, mapType],
		["type"],
		function (type: types.Type): constraints.BoundConstraintValidator {
			return function (collection: any[] | collections.FugaziMap<any>): boolean {
				if (coreTypes.is(collection, Array)) {
					return (<any[]> collection).every(item => type.validate(item));
				} else if (coreTypes.is(collection, Array)) {
					return (<collections.FugaziMap<any>> collection).values().every(item => type.validate(item));
				} else {
					return false;
				}
			}
		}
	));

	coreModule.addConstraint(new constraints.CoreConstraint(
		coreModule,
		"enum",
		"Enumerable",
		[stringType],
		["values", "ignore"],
		function (): constraints.BoundConstraintValidator {
			let ignoreCase = false,
				params = Array.from(arguments);

			if (params.first() === "ignoreCase") {
				ignoreCase = true;
				params.shift();
			}

			var tester = str => {
				if (ignoreCase) {
					return new RegExp("^" + str + "$", "i");
				} else {
					return new RegExp("^" + str + "$")
				}
			};

			return function (value: string): boolean {
				return params.some(current => current.test(tester(value)));
			}
		}
	));

	return coreModule;
}

// init
applicationBus.register(constants.Events.Loaded, function (): void {
	let ioModule: modules.Module = new modules.Module(),
		fugaziModule: modules.Module = new modules.Module(),
		coreModule: modules.Module;

	(<any> ioModule).name = "io";
	(<any> ioModule).title = "io module";
	(<any> ioModule).path = new components.Path(["io"]);

	(<any> fugaziModule).name = "fugazi";
	(<any> fugaziModule).title = "fugazi module";
	(<any> fugaziModule).parent = ioModule;
	(<any> fugaziModule).path = ioModule.getPath().child("fugazi");

	coreModule = createCoreModule((<any> fugaziModule).path);
	(<any> coreModule).parent = fugaziModule;
	(<any> coreModule).path = fugaziModule.getPath().child("core");

	ioModule.addModule(fugaziModule);
	fugaziModule.addModule(coreModule);

	addModule(ioModule);

	applicationBus.post(Events.Ready);
});
