/// <reference path="../components/types.ts" />
/// <reference path="view.ts" />

module fugazi.view.renderers {
	export interface RenderingComponentProperties extends ViewProperties {
		onStyleChange: StyleChangeListener;
		type: components.types.Type;
		value: any;
	}

	export interface RenderingComponentClass {
		new(props: RenderingComponentProperties): RenderingComponent<RenderingComponentProperties, ViewState>;
	}

	export class RenderingComponent<P extends RenderingComponentProperties, S extends ViewState> extends View<P, S> {}

	class AnyComponent extends RenderingComponent<RenderingComponentProperties, ViewState> {
		public render(): JSX.Element {
			var value: string;

			if (fugazi.is(this.props.value, collections.Map)) {
				value = JSON.stringify(this.props.value.asObject());
			} else if (fugazi.is(this.props.value, String)) {
				value = this.props.value;
			} else {
				value = JSON.stringify(this.props.value);
			}

			return <div className="typedValue any">
				<span className="value">{ value }</span>
				<span className="type">any</span>
			</div>;
		}
	}

	class VoidComponent extends RenderingComponent<RenderingComponentProperties, ViewState> {
		public render(): JSX.Element {
			if (this.props.value) {
				return <div className="void">
					<span className="message">{ this.props.value }</span>
				</div>;
			} else {
				return <div className="typedValue void empty" />;
			}
		}
	}

	class PrimitiveComponent extends RenderingComponent<RenderingComponentProperties, ViewState> {
		public render(): JSX.Element {
			var typeId, typeName, className: string = "typedValue primitive";

			typeId = this.props.type.getName();
			typeName = this.props.type.toString();
			className += " " + typeId.replace(/\./g, "_");

			return <div className={ className }>
				<span className="value">{ this.toStringValue(this.props.value) }</span>
				<span className="type">{ typeName }</span>
			</div>;
		}

		protected toStringValue(value: any): string {
			return fugazi.isNothing(value) ? "null" : value.toString();
		}
	}

	class StringComponent extends PrimitiveComponent {
		/**
		 * @override
		 */
		protected toStringValue(value: any): string {
			return "\"" + (fugazi.isNothing(value) ? "null" : value.toString()) + "\"";
		}
	}

	class UiMessageComponent extends StringComponent {
		/**
		 * @override
		 */
		protected toStringValue(value: any): string {
			return fugazi.isNothing(value) ? "null" : value.toString();
		}
	}

	export enum FoldState {
		Collapsed,
		Expanded
	}

	export interface CollectionComponentState extends ViewState {
		fold: FoldState;
		generics?: components.types.Type;
	}

	export abstract class CollectionComponent<T extends CollectionComponentState> extends RenderingComponent<RenderingComponentProperties, T> {
		public constructor(props: RenderingComponentProperties) {
			super(props);

			let genericsConstraint = components.registry.get(components.ComponentType.Constraint, "generics") as components.types.constraints.Constraint;

			this.state = {
				fold: FoldState.Collapsed
			} as T;

			if (props.type instanceof components.types.ConstrainedType) {
				this.state.generics = (props.type as components.types.ConstrainedType).getConstraintParamValue(genericsConstraint, "type");
			}
		}

		public componentDidUpdate(prevProps: RenderingComponentProperties, prevState: T) {
			this.props.onStyleChange();
		}

		/**
		 * @override
		 */
		public render(): JSX.Element {
			let paths: components.Path[],
				collectionSizeElement,
				className = "typedValue collection " + FoldState[this.state.fold].toLowerCase(),
				iconClassName = "icon fold fa " + (this.state.fold === FoldState.Collapsed ? "fa-chevron-right" : "fa-chevron-down");

			if (this.props.type instanceof components.types.ConstrainedType) {
				paths = (this.props.type as components.types.ConstrainedType).getHierarchicPaths().reverse();
			} else {
				paths = [this.props.type.getPath()];
			}

			if (this.showSize()) {
				collectionSizeElement = <span className="type_size">(size: { this.getItemsCount() })</span>;
			}

			paths.forEach(path => className += " " + path.toString().replace(/\./g, "_"));

			return <div className={ className }>
				<div className="header">
					<i className={ iconClassName } onClick={ this.onClick.bind(this) }></i>
					<span className="type_name">{ this.props.type.toString() }</span>
					{ collectionSizeElement }
					<span className="bracket">{ this.getBracket("open") }</span>
				</div>
				<ol className="value clearfix">
					{ this.getChildren() }
				</ol>
				<div className="footer">
					<span className="bracket">{ this.getBracket("close") }</span>
				</div>
			</div>;
		}

		protected onClick(event: React.MouseEvent<any>): void {
			this.setState({
				fold: this.state.fold === FoldState.Collapsed ? FoldState.Expanded : FoldState.Collapsed
			} as T);
		}

		protected showSize(): boolean {
			return true;
		}

		protected abstract getChildren(): JSX.Element[];

		protected abstract getItemsCount(): number;

		protected abstract getBracket(direction: "open" | "close"): string;
	}

	export class ListComponent extends CollectionComponent<CollectionComponentState> {
		public constructor(props: RenderingComponentProperties) {
			super(props);
		}

		protected getChildren(): JSX.Element[] {
			let childRenderer: Renderer,
				children: JSX.Element[] = [],
				childType: components.types.Type,
				values: any[] = this.props.value;

			values.forEach((value, index) => {
				childType = this.state.generics || getTypeForValue(value);
				childRenderer = getRenderer(childType);

				children.push(<li key={ index.toString() } className="item clearfix">{ childRenderer.render({
					onStyleChange: this.props.onStyleChange,
					type: childType,
					value: value
				}) }</li>);
			});

			return children;
		}

		protected getItemsCount(): number {
			return this.props.value.length;
		}

		protected getBracket(direction: "open" | "close"): string {
			return direction === "open" ? "[" : "]";
		}
	}

	export interface MapComponentState extends CollectionComponentState {
		isStruct: boolean;
		fields?: collections.Map<components.types.Type>;
	}

	export class MapComponent extends CollectionComponent<MapComponentState> {
		constructor(props: RenderingComponentProperties) {
			super(props);

			let structConstraint = components.registry.get(components.ComponentType.Constraint, "struct") as components.types.constraints.Constraint;

			let fieldsList: collections.Map<components.types.Type>[];

			if (props.type instanceof components.types.ConstrainedType) {
				fieldsList = (props.type as components.types.ConstrainedType).getConstraintParamValues(structConstraint, "fields");
			}

			if (fieldsList && fieldsList.length > 0) {
				this.state.isStruct = true;
				this.state.fields = collections.map<components.types.Type>();
				fieldsList.forEach(map => this.state.fields.extend(map));
			} else {
				this.state.isStruct = false;
			}
		}

		protected showSize(): boolean {
			return !this.state.isStruct;
		}

		protected getChildren(): JSX.Element[] {
			let values: collections.Map<any> = fugazi.isPlainObject(this.props.value) ? collections.map(this.props.value, true) : this.props.value;

			if (this.state.isStruct) {
				return this.childrenFromStruct(values);
			} else {
				return this.childrenFromMap(values);
			}
		}

		protected getItemsCount(): number {
			return this.props.value instanceof collections.Map ? this.props.value.size() : Object.keys(this.props.value).length;
		}

		protected getBracket(direction: "open" | "close"): string {
			return direction === "open" ? "{" : "}";
		}

		private childrenFromMap(values: collections.Map<any>): JSX.Element[] {
			let children: JSX.Element[] = [];

			values.keys().forEach(childName => {
				let childValue = values.get(childName),
					childType = this.state.generics || getTypeForValue(childValue),
					childRenderer = getRenderer(childType);

				children.push(<li key={ childName } className="item clearfix">
					<div className="item_key">{ childName }</div>
					<div className="colon">:</div>
					<div className="item_value">{
						childRenderer.render({
							type: childType,
							value: childValue,
							onStyleChange: this.props.onStyleChange
							})
						}</div>
				</li>);
			});

			return children;
		}

		private childrenFromStruct(values: collections.Map<any>): JSX.Element[] {
			let children: JSX.Element[] = [];

			values.keys().forEach(childName => {
				let childValue = values.get(childName);
				let childType = this.state.fields.get(childName);
				let childRenderer = getRenderer(childType);

				children.push(<li key={ childName } className="item clearfix">
					<div className="item_key">{ childName }</div>
					<div className="colon">:</div>
					<div className="item_value">{ childRenderer.render({
						type: childType,
						value: childValue,
						onStyleChange: this.props.onStyleChange
						}) }</div>
				</li>);
			});

			return children;
		}
	}

	export class Renderer {
		private componentClass: RenderingComponentClass;

		public constructor(componentClass: RenderingComponentClass) {
			this.componentClass = componentClass;
		}

		public render(props: RenderingComponentProperties): React.ReactElement<RenderingComponentProperties> {
			return React.createElement(this.componentClass, props);
		}
	}

	export function getRenderer(type: components.types.Type): Renderer {
		var componentClass: RenderingComponentClass;

		if (type.is(components.registry.getType("void"))) {
			componentClass = VoidComponent;
		} else if (type.is(components.registry.getType("any"))) {
			componentClass = AnyComponent;
		//} else if (type.is(components.registry.getType("boolean")) || type === components.registry.get(components.ComponentType.Type, "number")) {
		} else if (type.is(components.registry.getType("boolean")) || type.is(components.registry.getType("number"))) {
			componentClass = PrimitiveComponent;
		} else if (type.is(components.registry.getType("ui.message"))) {
			componentClass = UiMessageComponent;
		} else if (type.is(components.registry.getType("string"))) {
			componentClass = StringComponent;
		} else if (type.is(components.registry.getType("list"))) {
			componentClass = ListComponent;
		} else if (type.is(components.registry.getType("map"))) {
			componentClass = MapComponent;
		} else {
			throw new fugazi.Exception("parser not found for type");
		}

		return new Renderer(componentClass);
	}

	function getTypeForValue(value: any): components.types.Type {
		let name: string;

		if (fugazi.is(value, String)) {
			name = "string";
		} else if (fugazi.is(value, collections.Map) || fugazi.isPlainObject(value)) {
			name = "map";
		} else if (fugazi.is(value, Array)) {
			name = "list";
		} else if (fugazi.is(value, Boolean)) {
			name = "boolean";
		}  else if (fugazi.is(value, Number)) {
			name = "number";
		} else {
			name = "any";
		}

		return components.registry.get(components.ComponentType.Type, name) as components.types.Type;
	}
}