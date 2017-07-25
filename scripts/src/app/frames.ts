/// <reference path="../core/dom.ts" />
/// <reference path="../core/net.ts" />
/// <reference path="../core/types.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="./application.ts" />
/// <reference path="../components/commands.ts" />
/// <reference path="../channels/protocol.ts" />

namespace fugazi.app.frames {
	const LOAD_TIMEOUT = 3000;
	const HANDSHAKE_TIMEOUT = 3000;

	let framesContainer: HTMLDivElement;

	class Loader {
		private source: net.Url;
		private channelId: string;
		private timer: utils.Timer;
		private element: HTMLIFrameElement;
		private future: Future<HTMLIFrameElement>;

		constructor(channelId: string, source: net.Url) {
			this.future = new Future();
			this.channelId = channelId;

			this.source = channels.createUrlWithData(source, channelId);
		}

		load(): Promise<HTMLIFrameElement> {
			this.element = dom.create("iframe", {}, framesContainer) as HTMLIFrameElement;
			this.element.onload = this.onLoaded.bind(this);
			this.element.src = this.source.toString();
			this.timer = new utils.Timer(LOAD_TIMEOUT, this.onFailed.bind(this, "frame load timed out"));

			return this.future.asPromise();
		}

		private onLoaded(): void {
			this.timer.cancel();
			this.future.resolve(this.element);
		}

		private onFailed(reason: string): void {
			dom.remove(this.element);
			this.future.reject(new Exception(reason));
		}
	}

	export class FrameChannel extends channels.Channel {
		private source: net.Url;
		private element: HTMLIFrameElement;
		private handshakeTimer: utils.Timer;

		constructor(id: string, source: net.Url, element: HTMLIFrameElement) {
			super(id, source.origin, element.contentWindow);

			this.source = source;
			this.element = element;

			const handler = () => {
				this.handshakeTimer.cancel();
				this.unregister(channels.MessageTypes.Handshake, handler);
			};
			this.register(channels.MessageTypes.Handshake, handler);

			this.handshakeTimer = new utils.Timer(HANDSHAKE_TIMEOUT, () => {
				dom.remove(this.element);
			});
		}

		public static from<T>(this: { new(id: string, source: net.Url, element: HTMLIFrameElement): T }, source: net.Url): Promise<T> {
			const id = utils.generateId({ max: 15, min: 8 });
			const loader = new Loader(id, source);
			return loader.load().then(frame => new this(id, source, frame));
		}
	}

	class ProxyHttpResponse implements net.HttpResponse {
		private contentType: string;
		private statusCode: number;
		private httpStatus: number;
		private httpStatusText: string;
		private data: string;

		constructor (responseProperties: channels.frames.proxy.ExecuteCommandResponsePayload) {
			this.contentType = responseProperties.contentType;
			this.statusCode = responseProperties.statusCode;
			this.httpStatus = responseProperties.httpStatus;
			this.httpStatusText = responseProperties.httpStatusText;
			this.data = responseProperties.data;
		}

		public getXHR(): XMLHttpRequest {
			return null;
		}

		public getStatusCode(): number {
			return this.statusCode;
		}

		public getStatus(): net.Status {
			switch (this.statusCode) {
				case 0:
					return net.Status.None;

				case 200:
					return net.Status.Success;

				case 304:
					return net.Status.NotModified;

				case 408:
					return net.Status.Timeout;

				default:
					return net.Status.Error;
			}
		}

		public getHttpStatus(): number {
			return this.httpStatus;
		}

		public getHttpStatusText(): string {
			return this.httpStatusText;
		}

		public isContentType(contentType: string): boolean {
			return this.getContentType().toLowerCase().startsWith(contentType.toLowerCase());
		}

		public getContentType(): string {
			return this.contentType;
		}

		public getData(): string {
			return this.data;
		}

		public guessData(): any {
			const contentType = net.ContentTypes.fromString(this.contentType);

			if (contentType === net.ContentTypes.Json) {
				return this.getDataAsJson();
			} else {
				return this.getData();
			}
		}

		public getDataAsJson<T>(): any | T {
			try {
				return JSON.parse(this.data);
			} catch (exception) {
				throw new fugazi.Exception("unable to parse response data");
			}
		}

		public getDataAsMap<T>(): collections.Map<T> {
			return collections.map<T>(this.getDataAsJson());
		}
	}

	export class ProxyFrameChannel extends FrameChannel {
		execute(properties: net.RequestProperties, data?: string | net.RequestData): Promise<net.HttpResponse> {
			const request: channels.frames.proxy.ExecuteCommandRequestPayload = {
					method: properties.method,
					url: properties.url.toString(),
					headers: properties.headers,
					data: data instanceof collections.Map ? data.asObject() : data
				};

			return new Promise<net.HttpResponse>(resolve => {
				const listener = (response: channels.ChannelMessage<channels.frames.proxy.ExecuteCommandResponsePayload>) => {
					if (response.payload.requestId === requestId) {
						this.unregister(channels.frames.proxy.MessageTypes.ExecuteCommandResponse, listener);
						resolve(new ProxyHttpResponse(response.payload));
					}
				}
				this.register(channels.frames.proxy.MessageTypes.ExecuteCommandResponse, listener);
				const requestId = this.sendMessage(channels.frames.proxy.MessageTypes.ExecuteCommandRequest, request);
			});
		}
	}

	// init
	app.bus.register(app.Events.Loaded, () => {
		channels.init();

		framesContainer = dom.create("div", {
			id: "frames"
		}, document.body) as HTMLDivElement;
	});
}