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

	public startsWith(prefix: string | string[] | Path): boolean {
		if (typeof prefix === "string") {
			prefix = prefix.split(".");
		} else if (prefix instanceof Path) {
			prefix = prefix.names;
		}

		return prefix.every((name, index) => this.names[index] === name);
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

export class MarkdownBuilder {
	private markdown = "";

	h1(value: string): this {
		return this.append("# " + value);
	}

	h2(value: string): this {
		return this.append("## " + value);
	}

	h3(value: string): this {
		return this.append("### " + value);
	}

	h4(value: string): this {
		return this.append("#### " + value);
	}

	h5(value: string): this {
		return this.append("##### " + value);
	}

	h6(value: string): this {
		return this.append("###### " + value);
	}

	newLine(): this {
		return this.append("\n", false);
	}

	li(value: string): this {
		return this.append(" * " + value);
	}

	codeStart(language: string = ""): this {
		return this.append("```" + language);
	}

	codeEnd(): this {
		return this.append("```");
	}

	block(value: string): this {
		return this.append("> " + value);
	}

	append(value: string, newLine = true): this {
		this.markdown += value;
		return newLine ? this.newLine() : this;
	}

	toString() {
		return this.markdown;
	}
}

export type Manual = {
	method: "replace" | "append";
	markdown: string;
}

export class Component {
	protected path: Path;
	protected type: ComponentType;
	protected parent: Component;
	protected name: string;
	protected title: string;
	protected manual: Manual;
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

	public getManual(): string {
		let markdown: string;

		if (this.manual) {
			if (this.manual.method === "replace") {
				markdown = this.manual.markdown;
			} else {
				markdown = this.defaultManual() + "\n" + this.manual.markdown;
			}
		} else {
			markdown = this.defaultManual();
		}

		return markdown;
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

	protected defaultManual(): string {
		const markdown = Component.markdown();

		markdown.h3(ComponentType[this.getComponentType()] + ": " + this.getName());

		if (this.getTitle() !== this.getName()) {
			markdown.h4(this.getTitle());
		}

		if (this.getDescription()) {
			markdown.block(this.getDescription());
		}

		markdown.h4("**Path**: " + this.getPath().toString());

		return markdown.toString();
	}

	protected static markdown(): MarkdownBuilder {
		return new MarkdownBuilder();
	}
}


export interface ComponentResolver {
	resolve<T extends Component>(type: ComponentType, name: string): T;
}


