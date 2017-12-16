import * as view from "./view";
import * as renderers from "./renderers";
import * as statements from "../app/statements";
import * as constants from "../app/constants";
import * as coreTypes from "../core/types";
import * as handler from "../components/commands.handler";
import * as commands from "../components/commands";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Ps from "perfect-scrollbar";
import { snitchers } from "../core/snitch";

let history: Array<OutputItemInfo> = [];

export interface OutputItemInfo {
}

interface MessageOutputItemInfo extends OutputItemInfo {
	message: string;
}

interface ExecutionOutputItemInfo extends OutputItemInfo {
	statement: string;
	result: commands.ExecutionResult;
}

function getOutputItemInfoType(info: OutputItemInfo): "message" | "execution" | "unknown" {
	if (coreTypes.is((info as MessageOutputItemInfo).message, String)) {
		return "message";
	}

	if (coreTypes.is((info as ExecutionOutputItemInfo).statement, String) && coreTypes.is((info as ExecutionOutputItemInfo).result, commands.ExecutionResult)) {
		return "execution";
	}

	return "unknown";
}

export interface OutputProperties extends view.ViewProperties {
	ref?: string;
	sayhello?: boolean;
}

export interface OutputState extends view.ViewState {
	sayhello: boolean;
	output: Array<OutputItemInfo>;
}

export type StyleChangeListener = () => void;

const PsSingleton = {
	_mainContainer: null,
	_currentContainer: null,
	_params: {useSelectionScroll: true, suppressScrollX: true},
	init: function (mainContainer: HTMLElement) {
		this._mainContainer = mainContainer;
		Ps.initialize(this._mainContainer, this._params);
	},
	focused: function (): boolean {
		return this._currentContainer !== null;
	},
	focus: function (container: HTMLElement): boolean {
		if (this.focused()) {
			if (container !== this._currentContainer) {
				this.blur();
			}
			return false;
		}

		Ps.destroy(this._mainContainer);
		this._currentContainer = container;
		Ps.initialize(this._currentContainer, this._params);
		return true;
	},
	blur: function (container?: HTMLElement): boolean {
		if (!this.focused() || (container && container !== this._currentContainer)) {
			return false;
		}

		Ps.destroy(this._currentContainer);

		this._currentContainer = null;
		Ps.initialize(this._mainContainer, this._params);
	}
};

export class OutputView extends view.View<OutputProperties, OutputState> {
	private container: HTMLElement;
	private shouldScrollBottom: boolean;

	static defaultProps: OutputProperties = {
		sayhello: true
	}

	public constructor(props: OutputProperties) {
		super(props);

		this.shouldScrollBottom = false;
		this.state = {
			sayhello: props.sayhello,
			output: history
		};
	}

	public componentDidMount(): void {
		PsSingleton.init(this.container);
	}

	public componentWillUpdate(): void {
		this.shouldScrollBottom = this.checkOverflow();
	}

	public componentDidUpdate(): void {
		var node = ReactDOM.findDOMNode(this) as HTMLElement;

		if (this.shouldScrollBottom) {
			node.scrollTop = node.scrollHeight
		}

		Ps.update(node);
	}

	public clear(): void {
		history = [];

		this.setState({
			sayhello: false,
			output: history
		} as OutputState);
	}

	public addExecutionResult(statement: string, result: commands.ExecutionResult): void {
		if (statement === "clear") {
			return;
		}

		history.push({
			result: result,
			statement: statement
		});

		this.setState({
			output: history
		} as OutputState);
	}

	public render(): JSX.Element {
		let blocks: JSX.Element[] = [];

		this.state.output.forEach((info, index) => {
			const infoType = getOutputItemInfoType(info);

			if (infoType === "message") {
				blocks.push(<li key={ `${ index.toString() }-separator` } className="separator"></li>);
				blocks.push(<li key={ index.toString() } className="message">
					<i className="fa fa-square-o"></i>
					{ (info as MessageOutputItemInfo).message }
				</li>);
			} else if (infoType === "execution") {
				blocks.push(<li key={ `${ index.toString() }-separator` } className="separator"></li>);

				if ((info as ExecutionOutputItemInfo).result.getType().is("void")) {
					blocks.push(<li key={ index.toString() } className="async execution">
						<div className="command">
							<i className="fa fa-square-o"></i>
							{ (info as ExecutionOutputItemInfo).statement }
						</div>
					</li>);
				} else {
					blocks.push(<li key={ index.toString() } className="async execution">
						<div className="command">
							<i className="fa fa-square-o"></i>
							{ (info as ExecutionOutputItemInfo).statement }
						</div>
						<ResultView result={ (info as ExecutionOutputItemInfo).result }
									onBeforeStyleChange={ this.onBeforeStyleChange.bind(this) }
									onStyleChange={ this.onStyleChange.bind(this) }/>
					</li>);
				}
			} else {
				snitchers.warn("unknown OutputItemInfo type: ", info);
			}
		});

		if (this.state.sayhello) {
			blocks.unshift(
				<li key="hello" className="hello version">fugazi version { constants.version.code }</li>,
				<li key="repoLink" className="hello moreInfo">
					run <span className="help-command">help</span> for more info or
					check out the <a target="_blank" href="https://github.com/fugazi-io/webclient">GitHub repo</a>
				</li>,
				<li key="helpUs" className="hello help">
					we'd love to get your feedback, so if something isn't clear or not working find us in <a
					target="_blank" href="https://gitter.im/fugazi-io/Lobby">our gitter</a>
				</li>
			);
		}

		return <section className="output" ref={ el => this.container = el } onClick={ this.onClick.bind(this) }>
			<div className="spacer"></div>
			<ol className="items">{ blocks }</ol>
		</section>;
	}

	private onClick() {
		PsSingleton.blur();
	}

	private onBeforeStyleChange(): void {
		this.shouldScrollBottom = this.checkOverflow();
	}

	private onStyleChange(): void {
		this.componentDidUpdate();
	}

	private checkOverflow(): boolean {
		var node: any = ReactDOM.findDOMNode(this);
		return node.scrollTop + node.offsetHeight === node.scrollHeight;
	}
}

interface ResultViewProperties extends view.ViewProperties {
	onBeforeStyleChange: StyleChangeListener;
	onStyleChange: StyleChangeListener;
	result: commands.ExecutionResult;
}

interface ResultViewState extends view.ViewState {
	status: string; // pending, success, fail
	value?: any;
	error?: coreTypes.Exception;
}

class ResultView extends view.View<ResultViewProperties, ResultViewState> {
	private container: HTMLDivElement;
	private focused: boolean;

	constructor(props: ResultViewProperties) {
		super(props);

		this.state = {
			status: "pending"
		}
	}

	/**
	 * @Override
	 */
	public componentDidMount(): void {
		this.props.result.then(this.success.bind(this)).catch(this.fail.bind(this));
	}

	public componentWillUpdate(): void {
		this.props.onBeforeStyleChange();
	}

	public componentDidUpdate(): void {
		this.props.onStyleChange();
	}

	/**
	 * @Override
	 */
	public render(): JSX.Element {
		let error: string,
			element: JSX.Element,
			status = this.state.status,
			renderer: renderers.Renderer,
			className = "result clearfix ";

		if (status === "success" && !this.props.result.getType()) {
			status = "fail";
			error = "error: result contains no type";
		}

		switch (status) {
			case "pending":
				className += "pending";
				element = <span className="message">pending</span>;
				break;

			case "success":
				className += "success";
				renderer = renderers.getRenderer(this.props.result.getType(), this.state.value);
				element = renderer.render({
					onStyleChange: this.props.onStyleChange,
					type: this.props.result.getType(),
					value: this.state.value
				});
				break;

			case "fail":
				className += "error";
				element = <span className="message">{ error || this.createErrorMessage() }</span>;
				break;
		}

		return <div className={ className } ref={ el => this.container = el }
					onDoubleClick={ this.onDoubleClick.bind(this) } onClick={ this.onClick.bind(this) }>
			<i className="fa fa-square"></i>
			{ element }
		</div>;
	}

	private onClick(event: React.MouseEvent<HTMLDivElement>) {
		event.stopPropagation();
		PsSingleton.focus(this.container);
	}

	private onDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
		event.stopPropagation();
		PsSingleton.blur(this.container);
		var selection = window.getSelection();
		if (selection) {
			selection.removeAllRanges();
		}
	}

	private success(value: any): void {
		this.setState({
			status: "success",
			value: handler.isPromptData(value) ? value.message : value
		});
	}

	private fail(error: coreTypes.Exception): void {
		this.setState({
			status: "fail",
			error: error
		});
	}

	private createErrorMessage(): string {
		if (coreTypes.is(this.state.error, statements.InvalidStatementException)) {
			let param = (this.state.error as statements.InvalidStatementException).getInvalidParts()[0] as statements.ParameterPart;
			return `${ param.getValue() } can not be assigned to parameter "${ param.getName() }" of type ${ param.getType() }`;
		}

		return this.state.error.message;
	}
}
