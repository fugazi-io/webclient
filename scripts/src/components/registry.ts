/// <reference path="../core/types.ts" />
/// <reference path="../app/application.ts" />
/// <reference path="../app/semantics.ts" />
/// <reference path="components.ts" />
/// <reference path="modules.ts" />
/// <reference path="converters.ts" />

/**
 * Created by nitzan on 24/03/2016.
 */

module fugazi.components.registry {
	var index: collections.Map<modules.Module> = collections.map<modules.Module>(),
		defaultConverters: collections.Map<converters.Converter> = collections.map<converters.Converter>();

	export class ModuleAssociationException extends Exception { }

	export var Events = {
		Ready: "components.registry.ready"
	};

	export interface LoadProperties {
		augment?: boolean;
		url: string | net.Url;
	}

	export function load(props: LoadProperties): Promise<modules.Module> {
		let url: net.Url = props.url instanceof net.Url ? <net.Url> props.url : new net.Url(<string> props.url),
			future = new fugazi.Future<modules.Module>(),
			moduleBuilder = modules.builder.create(url) as modules.builder.Builder;

		moduleBuilder.build()
			.then(wrapper => {
				const basePath = moduleBuilder.getBasePath();

				try {
					moduleBuilder.associate();

					let actualModule = wrapper;
					for (let i = 0; i < basePath.length - 1; i++) {
						actualModule = actualModule.getModule(basePath.at(i + 1));
					}

					if (!props.augment && has(ComponentType.Module, actualModule.getPath().toString())) {
						console.log(`already have module: "${ actualModule.getPath().toString() }"`);
						future.resolve(get(ComponentType.Module, actualModule.getPath().toString()) as modules.Module);
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
				} catch(e) {
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

	export function has(type: ComponentType, pathString: string): boolean {
		return get(type, pathString) != null;
	}

	export function get<T extends Component>(type: ComponentType, pathString: string): T;
	export function get(type: ComponentType, pathString: string): Component {
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

	export function getUnknown(pathString: string): Component | null {
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

	function recursiveGet(type: ComponentType, path: string[], parent?: modules.Module): Component {
		let name;

		if (path.length === 1) {
			if (!parent) {
				return type === ComponentType.Module ? index.get(path.first()) : null;
			}

			switch (type) {
				case ComponentType.Module:
					return parent.getModule(path.first());

				case ComponentType.Type:
					return parent.getType(path.first());

				case ComponentType.Constraint:
					return parent.getConstraint(path.first());

				case ComponentType.Command:
					return parent.getCommand(path.first());

				case ComponentType.Converter:
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
		return <types.Type> get(ComponentType.Type, pathString);
	}

	export function guessType(value: any): components.types.Type {
		if (value instanceof Array) {
			return components.registry.getType("list");
		}

		if (isPlainObject(value) || value instanceof collections.Map) {
			return components.registry.getType("map");
		}

		if (fugazi.is(value, Number)) {
			return components.registry.getType("number");
		}

		if (fugazi.is(value, Boolean)) {
			return components.registry.getType("boolean");
		}

		return typeof value === "string" ? components.registry.getType("string") : components.registry.getType("any");
	}

	export function guessTypeFromString(value: string): components.types.Type {
		if (!isNaN(parseFloat(value))) {
			return components.registry.getType("number");
		}

		if (["true", "false"].includes(value.toLowerCase())) {
			return components.registry.getType("boolean");
		}

		return components.registry.getType("string");
	}

	export function getModule(pathString: string): modules.Module {
		return <modules.Module> get(ComponentType.Module, pathString);
	}

	export function getModules(parentPath?: string): modules.Module[] {
		if (parentPath) {
			let parentModule = getModule(parentPath);

			if (!parentModule) {
				throw new fugazi.Exception("no such module " + parentPath);
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
			return <converters.Converter> get(ComponentType.Converter, args[0]);
		}

		if (args.length == 2 && args[0] instanceof types.Type && args[1] instanceof types.Type) {
			return defaultConverters.get(createConverterKey(args[0], args[1]));
		}

		else return null;
	}

	function addComponent(parent: modules.Module, child: Component, type: ComponentType): void {
		switch (type) {
			case ComponentType.Module:
				parent.addModule(<modules.Module> child);
				break;

			case ComponentType.Type:
				parent.addType(<types.Type> child);
				break;

			case ComponentType.Constraint:
				parent.addConstraint(<types.constraints.Constraint> child);
				break;

			case ComponentType.Command:
				parent.addCommand(<commands.Command> child);
				break;

			case ComponentType.Converter:
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
				traverser = function(newModule: fugazi.components.modules.Module, parentModule: fugazi.components.modules.Module): void {
					newModule.forEachType(type => {
						if (parentModule.hasType(type.getName())) {
							throw new fugazi.Exception("type " + type.getPath() + " already exists");
						} else {
							transaction.push(addComponent.bind(null, parentModule, type, ComponentType.Type));
						}
					});

					newModule.forEachConstraint(constraint => {
						if (parentModule.hasConstraint(constraint.getName())) {
							throw new fugazi.Exception("constraint " + constraint.getPath() + " already exists");
						} else {
							transaction.push(addComponent.bind(null, parentModule, constraint, ComponentType.Constraint));
						}
					});

					newModule.forEachCommand(command => {
						if (parentModule.hasCommand(command.getName())) {
							throw new fugazi.Exception("command " + command.getPath() + " already exists");
						} else {
							transaction.push(addComponent.bind(null, parentModule, command, ComponentType.Command));
						}
					});

					newModule.forEachConverter(converter => {
						if (parentModule.hasConverter(converter.getName())) {
							throw new fugazi.Exception("converter " + converter.getPath() + " already exists");
						} else {
							transaction.push(addComponent.bind(null, parentModule, converter, ComponentType.Converter));
						}
					});

					newModule.forEachModule(newInnerModule => {
						if (parentModule.hasModule(newInnerModule.getName())) {
							if (parentModule.isRemote() && newInnerModule.isRemote()) {
								throw new fugazi.components.registry.ModuleAssociationException(
									`module ${newInnerModule.getName()} cannot be added 
								to module ${parentModule.getName()} since they both contain 'remote' definition`);
							}
							traverser(newInnerModule, parentModule.getModule(newInnerModule.getName()));
						} else {
							transaction.push(addComponent.bind(null, parentModule, newInnerModule, ComponentType.Module));
						}
					})
				};

			traverser(aModule, index.get(aModule.getName())); // might throw
			transaction.forEach(fn => fn());
		}

		app.semantics.update(aModule);
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
			throw new Exception("can only create key from a converter or two types");
		}

		return `${ from.getPath().toString() }=>${ to.getPath().toString() }`;
	}

	function createCoreModule(parentPath: Path): modules.Module {
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
			value => fugazi.is(value, Boolean)
		));

		coreModule.addType(new types.CoreType(
			coreModule,
			"number",
			"Number",
			value => fugazi.is(value, Number)
		));

		stringType = new types.CoreType(
			coreModule,
			"string",
			"String",
			value => fugazi.is(value, String)
		);
		coreModule.addType(stringType);

		listType = new types.CoreType(
			coreModule,
			"list",
			"List",
			value => fugazi.is(value, Array)
		);
		coreModule.addType(listType);

		mapType = new types.CoreType(
			coreModule,
			"map",
			"Map",
			value => {
				return fugazi.is(value, collections.Map) || fugazi.isPlainObject(value);
			}
		);
		coreModule.addType(mapType);

		// constraints
		coreModule.addConstraint(new types.constraints.CoreConstraint(
			coreModule,
			"struct",
			"Struct",
			[mapType],
			["fields"],
			function (fields: collections.Map<types.Type>): types.constraints.BoundConstraintValidator {
				return function(map: collections.Map<any> | fugazi.PlainObject<any>): boolean {
					if (map instanceof collections.Map) {
						return map.size() === fields.size() && map.keys().every(key => fields.has(key) && fields.get(key).validate(map.get(key)));
					} else {
						return Object.keys(map).length == fields.size() && Object.keys(map).every(key => fields.has(key) && fields.get(key).validate(map[key]));
					}
				}
			}
		));

		coreModule.addConstraint(new types.constraints.CoreConstraint(
			coreModule,
			"generics",
			"Generics",
			[listType, mapType],
			["type"],
			function (type: types.Type): types.constraints.BoundConstraintValidator {
				return function(collection: any[] | collections.Map<any>): boolean {
					if (fugazi.is(collection, Array)) {
						return (<any[]> collection).every(item => type.validate(item));
					} else if (fugazi.is(collection, Array)) {
						return (<collections.Map<any>> collection).values().every(item => type.validate(item));
					} else {
						return false;
					}
				}
			}
		));

		coreModule.addConstraint(new types.constraints.CoreConstraint(
			coreModule,
			"enum",
			"Enumerable",
			[stringType],
			["values", "ignore"],
			function (): types.constraints.BoundConstraintValidator {
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

				return function(value: string): boolean {
					return params.some(current => current.test(tester(value)));
				}
			}
		));

		return coreModule;
	}

	// init
	app.bus.register(app.Events.Loaded, function(): void {
		let ioModule: modules.Module = new modules.Module(),
			fugaziModule: modules.Module = new modules.Module(),
			coreModule: modules.Module;

		(<any> ioModule).name = "io";
		(<any> ioModule).title = "io module";
		(<any> ioModule).path = new Path(["io"]);

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

		app.bus.post(Events.Ready);
	});
}
