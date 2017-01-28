
/// <reference path="../../lib/perfect-scrollbar.d.ts" />

/// <reference path="../core/utils.ts" />
/// <reference path="../app/application.ts" />
/// <reference path="../components/commands.ts" />
/// <reference path="view.ts" />
/// <reference path="renderers.tsx" />

module fugazi.view {
	var history: Array<OutputItemInfo> = [];

	export interface OutputItemInfo {}

	interface MessageOutputItemInfo extends OutputItemInfo {
		message: string;
	}

	interface ExecutionOutputItemInfo extends OutputItemInfo {
		statement: string;
		result: components.commands.ExecutionResult;
	}

	function getOutputItemInfoType(info: OutputItemInfo): "message" | "execution" | "unknown" {
		if (fugazi.is((info as MessageOutputItemInfo).message, String)) {
			return "message";
		}

		if (fugazi.is((info as ExecutionOutputItemInfo).statement, String) && fugazi.is((info as ExecutionOutputItemInfo).result, components.commands.ExecutionResult)) {
			return "execution";
		}

		return "unknown";
	}

	export interface OutputProperties extends ViewProperties {
		ref?: string;
		sayhello?: boolean;
	}
	
	export interface OutputState extends ViewState {
		output: Array<OutputItemInfo>;
	}

	export type StyleChangeListener = () => void;
	
	export class OutputView extends View<OutputProperties, OutputState> {
		private shouldScrollBottom: boolean;

		static defaultProps: OutputProperties = {
			sayhello: true
		}

		public constructor(props: OutputProperties) {
			super(props);

			this.shouldScrollBottom = false;
			this.state = {
				output: history
			};
		}

		public componentDidMount(): void {
			var node: any = ReactDOM.findDOMNode(this);
			Ps.initialize(node, { useSelectionScroll: true, suppressScrollX: true });
		}

		public componentWillUpdate(): void {
			this.shouldScrollBottom = this.checkOverflow();
		}

		public componentDidUpdate(): void {
			var node = ReactDOM.findDOMNode(this);

			if (this.shouldScrollBottom) {
				node.scrollTop = node.scrollHeight
			}

			Ps.update(node);
		}

		public addExecutionResult(statement: string, result: components.commands.ExecutionResult): void {
			history.push({
				result: result,
				statement: statement
			});

			this.setState({
				output: history
			});
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
							<ResultView result={ (info as ExecutionOutputItemInfo).result } onStyleChange={ this.onStyleChange.bind(this) } />
						</li>);
					}
				} else {
					logger.warn("unknown OutputItemInfo type: ", info);
				}
			});

			if (this.props.sayhello) {
				blocks.unshift(<li key="hello" className="hello">fugazi version { app.version.code }</li>);
			}
			
			return <section className="output">
				<div className="spacer"></div>
				<ol className="items">{ blocks }</ol>
			</section>;
		}

		private onStyleChange(): void {
			this.shouldScrollBottom = this.checkOverflow();
			this.componentDidUpdate();
		}

		private checkOverflow(): boolean {
			var node: any = ReactDOM.findDOMNode(this);
			return node.scrollTop + node.offsetHeight === node.scrollHeight;
		}
	}

	interface ResultViewProperties extends ViewProperties {
		onStyleChange: StyleChangeListener;
		result: components.commands.ExecutionResult;
	}

	interface ResultViewState extends ViewState {
		status: string; // pending, success, fail
		value?: any;
		error?: fugazi.Exception;
	}

	class ResultView extends View<ResultViewProperties, ResultViewState> {
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

		/**
		 * @Override
		 */
		public render(): JSX.Element {
			let element: JSX.Element,
				renderer: renderers.Renderer,
				className = "result clearfix ";

			switch (this.state.status) {
				case "pending":
					className += "pending";
					element = <span className="message">pending</span>;
					break;

				case "success":
					className += "success";
					renderer = renderers.getRenderer(this.props.result.getType());
					element = renderer.render({ onStyleChange: this.props.onStyleChange, type: this.props.result.getType(), value: this.state.value });
					break;

				case "fail":
					className += "error";
					element = <span className="message">{ this.createErrorMessage() }</span>;
					break;
			}

			return <div className={ className }>
				<i className="fa fa-square"></i>
				{ element }
			</div>;
		}

		private success(value: any): void {
			this.setState({
				status: "success",
				value: components.commands.handler.isPromptData(value) ? value.message : value
			});
		}

		private fail(error: fugazi.Exception): void {
			this.setState({
				status: "fail",
				error: error
			});
		}
		
		private createErrorMessage(): string {
			if (fugazi.is(this.state.error, app.statements.InvalidStatementException)) {
				let param = (this.state.error as app.statements.InvalidStatementException).getInvalidParts()[0] as app.statements.ParameterPart;
				return `${ param.getValue() } can not be assigned to parameter "${ param.getName() }" of type ${ param.getType() }`;
			}

			return this.state.error.message;
		}
	}
}