/// <reference path="../core/types.ts" />
/// <reference path="../core/net.ts" />
/// <reference path="../core/utils.ts" />

/**
 * Created by hoggeg on 19/08/2016.
 */

namespace fugazi.channels {
	let myChannelId: string,
		parentChannelId: string | null = null,
		parentChannelOrigin: string | null = null;

	export interface ChannelUrlData {
		channelId: string;
		parentId: string;
		parentOrigin: string;
		scriptsBase: string; // used to load the scripts in the html files
	}

	function extractUrlData(): ChannelUrlData | null {
		let hash = document.location.hash;
		if (hash === "") {
			return null;
		}

		if (hash.startsWith("#")) {
			hash = hash.substring(1);
		}

		const data = JSON.parse(decodeURIComponent(hash));

		if (!data.channelId || !data.parentId || !data.parentOrigin) {
			throw new Exception("invalid channel url");
		}

		return data;
	}

	export function createUrlWithData(url: net.Url, channelId: string): net.Url {
		const data: ChannelUrlData = {
			channelId: channelId,
			parentId: myChannelId,
			parentOrigin: window.location.origin,
			scriptsBase: new net.Url("scripts/bin", app.location.base()).toString()
		};

		url = url.clone();
		url.setHash(encodeURIComponent(JSON.stringify(data)));
		return url;
	}

	export function init(): void {
		if (!opener && parent === window) { // main document
			myChannelId = utils.generateId({ max: 15, min: 8 });
		} else { // iframe or dialog
			const urlData = extractUrlData();

			myChannelId = urlData.channelId;
			parentChannelId = urlData.parentId;
			parentChannelOrigin = urlData.parentOrigin;
		}

		WINDOW_MESSAGE_LISTENER.start();
	}

	const CHANNELS = new Map<string, Channel>();
	const WINDOW_MESSAGE_LISTENER = {
		_started: false,
		start: function(this: typeof WINDOW_MESSAGE_LISTENER) {
			if (this._started) {
				return;
			}

			window.addEventListener("message", this.handler.bind(this));
			this._started = true;
		},
		handler: function(this: typeof WINDOW_MESSAGE_LISTENER, event: MessageEvent) {
			const envelop = normalizeMessage(event);

			if (!envelop || myChannelId !== envelop.targetId || !CHANNELS.has(envelop.sourceId)) {
				return;
			}

			CHANNELS.get(envelop.sourceId).handleMessage(envelop.message);
		}
	};

	function normalizeMessage(event: MessageEvent): ChannelMessageEnvelop | null {
		let data: ChannelMessageEnvelop;

		try {
			data = JSON.parse(event.data);
		} catch (e) {
			return null;
		}

		if (typeof data.sourceId !== "string"
				&& typeof data.targetId !== "string"
				&& typeof data.message.id !== "string"
				&& typeof data.message.type !== "string") {
			return null;
		}

		return data;
	}

	export interface ChannelMessageEnvelop {
		sourceId: string;
		targetId: string;
		message: ChannelMessage;
	}

	export interface ChannelMessage<T = any> {
		id: string;
		type: string;
		payload: T;
	}

	export type ChannelMessageListener<T = any> = (message: ChannelMessage<T>) => void;

	export interface MessageDispatcher {
		postMessage(message: any, targetOrigin: string): void;
	}

	export abstract class Channel {
		protected readonly id: string;

		private domain: string;
		private dispatcher: MessageDispatcher;
		private handlers: Map<string, ChannelMessageListener[]>;

		protected constructor(id: string, domain: string, dispatcher: MessageDispatcher) {
			this.id = id;
			this.domain = domain;
			this.dispatcher = dispatcher;
			this.handlers = new Map<string, ChannelMessageListener[]>();

			CHANNELS.set(this.id, this);
		}

		register<T>(type: string, handler: ChannelMessageListener<T>): ChannelMessageListener<T> {
			let list: ChannelMessageListener[];

			if (this.handlers.has(type)) {
				list = this.handlers.get(type);
			} else {
				list = [];
				this.handlers.set(type, list);
			}

			list.push(handler);
			return handler;
		}

		unregister(type: string, handler: ChannelMessageListener): void {
			if (this.handlers.has(type)) {
				const index = this.handlers.get(type).indexOf(handler);
				if (index > -1) {
					this.handlers.get(type).splice(index, 1);
				}
			}
		}

		sendMessage<T>(type: string, payload?: T): string {
			const message = {
				id: utils.generateId({ max: 15, min: 8 }),
				type
			} as ChannelMessage<T>;

			if (payload) {
				message.payload = payload;
			}

			const envelop = {
				sourceId: myChannelId,
				targetId: this.id,
				message
			};

			this.dispatcher.postMessage(JSON.stringify(envelop), this.domain);
			return message.id;
		}

		handleMessage(message: ChannelMessage): void {
			if (message.type === MessageTypes.Handshake) {
				this.sendMessage(MessageTypes.HandshakeAck);
			}

			if (this.handlers.has(message.type)) {
				this.handlers.get(message.type).forEach(handler => handler(message));
			}
		}
	}

	export abstract class ParentChannel extends Channel {
		protected constructor(dispatcher: MessageDispatcher, id?: string, domain?: string) {
			super(id || parentChannelId, domain || parentChannelOrigin, dispatcher);
			this.sendMessage(MessageTypes.Handshake);
		}
	}

	function createMessageType(...parts: string[]): string {
		return parts.concat("channel", "message").join(".");
	}
	export namespace MessageTypes {
		export const Handshake = createMessageType("handshake");
		export const HandshakeAck = createMessageType("handshake", "ack");
	}

	export namespace frames {
		const createFrameMessageType = createMessageType.bind(null, "frames");

		export class FrameParentChannel extends ParentChannel {
			constructor() {
				super(parent);
			}
		}

		export namespace proxy {
			const createProxyMessageType = createFrameMessageType.bind(null, "proxy");
			export namespace MessageTypes {
				export const ExecuteCommandRequest = createProxyMessageType("execute", "command", "request") as string;
				export const ExecuteCommandResponse = createProxyMessageType("execute", "command", "response") as string;
			}

			export type ExecuteCommandRequestPayload = {
				method: net.HttpMethod;
				url: string;
				headers: collections.Map<string> | fugazi.PlainObject<string>;
				data?: string | fugazi.PlainObject<any>;
			}

			export type ExecuteCommandResponsePayload = {
				requestId: string;
				statusCode: number;
				headers: collections.Map<string> | fugazi.PlainObject<string>;
				contentType: string,
				httpStatus: number,
				httpStatusText: string,
				status: "ok" | "error";
				data: string;
			}
		}
	}

	export namespace dialogs {
		const createDialogMessageType = createMessageType.bind(null, "dialogs");
		export namespace MessageTypes {
			export const CloseDialog = createDialogMessageType("close", "dialog");
		}

		export class OpenerChannel extends ParentChannel {
			constructor() {
				super(window.opener);
			}
		}
	}
}
