import * as React from "react";
import * as marked from "marked";
import * as output from "./output";
import * as view from "./view";
import * as collections from "../core/types.collections";
import * as coreTypes from "../core/types";
import * as types from "../components/types";
import * as components from "../components/components";
import * as constraints from "../components/constraints";
import * as registry from "../components/registry";

export interface RenderingComponentProperties extends view.ViewProperties {
	onStyleChange: output.StyleChangeListener;
	type: types.Type;
	value: any;
}

export interface RenderingComponentClass {
	new(props: RenderingComponentProperties): RenderingComponent<RenderingComponentProperties, view.ViewState>;
}

export class RenderingComponent<P extends RenderingComponentProperties, S extends view.ViewState> extends view.View<P, S> {
}

class AnyComponent extends RenderingComponent<RenderingComponentProperties, view.ViewState> {
	public render(): JSX.Element {
		var value: string;

		if (coreTypes.is(this.props.value, collections.Map)) {
			value = JSON.stringify(this.props.value.asObject());
		} else if (coreTypes.is(this.props.value, String)) {
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

class VoidComponent extends RenderingComponent<RenderingComponentProperties, view.ViewState> {
	public render(): JSX.Element {
		if (this.props.value) {
			return <div className="void">
				<span className="message">{ this.props.value }</span>
			</div>;
		} else {
			return <div className="typedValue void empty"/>;
		}
	}
}

class PrimitiveComponent extends RenderingComponent<RenderingComponentProperties, view.ViewState> {
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
		return coreTypes.isNothing(value) ? "null" : value.toString();
	}
}

class StringComponent extends PrimitiveComponent {
	/**
	 * @override
	 */
	protected toStringValue(value: any): string {
		return "\"" + (coreTypes.isNothing(value) ? "null" : value.toString()) + "\"";
	}
}

class UiMessageComponent extends StringComponent {
	/**
	 * @override
	 */
	protected toStringValue(value: any): string {
		return coreTypes.isNothing(value) ? "null" : value.toString();
	}
}

class MarkdownRenderer extends marked.Renderer {
	private static COMMAND_PATTERN = /\s*\/\/\s*command\s*\n/;
	private static OUTPUT_PATTERN = /\s*\/\/\s*output/;

	link(href: string, title: string, text: string): string {
		if (title) {
			return `<a href="${ href }" target="_blank" title="${ title }">${ text }</a>`;
		}

		return `<a href="${ href }" target="_blank">${ text }</a>`;
	}

	code(code: string, language: string): string {
		let html = `<pre class="fugazi">`;

		switch (language) {
			case "fugazi-command":
				html += MarkdownRenderer.parseCommand(code);

				break;

			case "fugazi-commands":
				let buffer = code;

				while (buffer.length > 0) {
					const command = MarkdownRenderer.getSingleCommand(buffer);
					buffer = buffer.replace(command, "").trim();
					html += MarkdownRenderer.parseCommand(command);
				}

				break;

			default:
				return super.code(code, language);
		}

		return html + "</pre>";
	}

	private static getSingleCommand(code: string): string {
		const offset = 5;
		const index = code.trim().slice(offset).search(MarkdownRenderer.COMMAND_PATTERN) + offset;
		if (index < offset) {
			return code;
		}

		return code.substring(0, index);
	}

	private static parseCommand(code: string): string {
		const outputIndex = code.search(MarkdownRenderer.OUTPUT_PATTERN);
		const command = (outputIndex < 0 ? code : code.substring(0, code.search(MarkdownRenderer.OUTPUT_PATTERN))).replace(MarkdownRenderer.COMMAND_PATTERN, "").trim();
		const output = outputIndex < 0 ? "" : code.substring(outputIndex).replace(MarkdownRenderer.OUTPUT_PATTERN, "").trim();

		let html = `<span class="fugazi-command">command //</span><code class="lang-fugazi-command">${ command }</code>`;

		if (output.length > 0) {
			html += `<span class="fugazi-output">output:</span><code class="lang-fugazi-output">${ output }</code>`;
		}

		return html + "<div class=\"separator\"></div>";
	}
}

export class UiMarkdownComponent extends RenderingComponent<RenderingComponentProperties, view.ViewState> {
	private static renderer = new MarkdownRenderer();

	render() {
		return (
			<div
				className="markdown"
				dangerouslySetInnerHTML={{__html: marked(this.props.value, {renderer: UiMarkdownComponent.renderer})}}/>);
	}
}

export enum FoldState {
	Collapsed,
	Expanded
}

export interface CollectionComponentState extends view.ViewState {
	fold: FoldState;
	generics?: types.Type;
}

export abstract class CollectionComponent<T extends CollectionComponentState> extends RenderingComponent<RenderingComponentProperties, T> {
	public constructor(props: RenderingComponentProperties) {
		super(props);

		let genericsConstraint = registry.get(components.ComponentType.Constraint, "generics") as constraints.Constraint;

		this.state = {
			fold: FoldState.Collapsed
		} as T;

		if (props.type instanceof types.ConstrainedType) {
			this.setState({
				generics: (props.type as types.ConstrainedType).getConstraintParamValue(genericsConstraint, "type")
			});
		}
	}

	public componentDidUpdate(prevProps: RenderingComponentProperties, prevState: T) {
		this.props.onStyleChange();
	}

	/**
	 * @override
	 */
	public render(): JSX.Element {
		let fold: FoldState = this.state.fold;
		let paths: components.Path[],
			collectionSizeElement,
			className = "typedValue collection " + FoldState[fold].toLowerCase(),
			iconClassName = "icon fold fa " + (this.state.fold === FoldState.Collapsed ? "fa-chevron-right" : "fa-chevron-down");

		if (this.props.type instanceof types.ConstrainedType) {
			paths = (this.props.type as types.ConstrainedType).getHierarchicPaths().reverse();
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
			childType: types.Type,
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
	fields?: collections.Map<types.Type>;
}

export class MapComponent extends CollectionComponent<MapComponentState> {
	constructor(props: RenderingComponentProperties) {
		super(props);

		let structConstraint = registry.get(components.ComponentType.Constraint, "struct") as constraints.Constraint;

		let fieldsList: collections.Map<types.Type>[];

		if (props.type instanceof types.ConstrainedType) {
			fieldsList = (props.type as types.ConstrainedType).getConstraintParamValues(structConstraint, "fields");
		}

		if (fieldsList && fieldsList.length > 0) {
			this.setState({
				isStruct: true,
				fields: collections.map<types.Type>()
			});
			fieldsList.forEach(map => this.state.fields.extend(map));
		} else {
			this.setState({
				isStruct: false
			});
		}
	}

	protected showSize(): boolean {
		return !this.state.isStruct;
	}

	protected getChildren(): JSX.Element[] {
		let values: collections.Map<any> = coreTypes.isPlainObject(this.props.value) ? collections.map(this.props.value, true) : this.props.value;

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

export function getRenderer(type: types.Type, value?: any): Renderer {
	let componentClass: RenderingComponentClass;
	let renderingType: types.Type = type;

	if (value != null) {
		try {
			const valueType = getTypeForValue(value);

			// use the type of the value only if it extends the passed in type
			// for example if type = ui.markdown then type(value) = string
			if (valueType.is(type)) {
				renderingType = valueType;
			}
		} catch (e) {
		}
	}

	if (renderingType.is(registry.getType("void"))) {
		componentClass = VoidComponent;
	} else if (renderingType.is(registry.getType("boolean")) || renderingType.is(registry.getType("number"))) {
		componentClass = PrimitiveComponent;
	} else if (renderingType.is(registry.getType("ui.markdown"))) {
		componentClass = UiMarkdownComponent;
	} else if (renderingType.is(registry.getType("ui.message"))) {
		componentClass = UiMessageComponent;
	} else if (renderingType.is(registry.getType("string"))) {
		componentClass = StringComponent;
	} else if (renderingType.is(registry.getType("list"))) {
		componentClass = ListComponent;
	} else if (renderingType.is(registry.getType("map"))) {
		componentClass = MapComponent;
	} else if (renderingType.is(registry.getType("any"))) {
		componentClass = AnyComponent;
	} else {
		throw new coreTypes.Exception("parser not found for type");
	}

	return new Renderer(componentClass);
}

function getTypeForValue(value: any): types.Type {
	let name: string;

	if (coreTypes.is(value, String)) {
		name = "string";
	} else if (coreTypes.is(value, collections.Map) || coreTypes.isPlainObject(value)) {
		name = "map";
	} else if (coreTypes.is(value, Array)) {
		name = "list";
	} else if (coreTypes.is(value, Boolean)) {
		name = "boolean";
	} else if (coreTypes.is(value, Number)) {
		name = "number";
	} else {
		name = "any";
	}

	return registry.get(components.ComponentType.Type, name) as types.Type;
}