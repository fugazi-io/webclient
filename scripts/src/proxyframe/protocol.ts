/// <reference path="../core/types.ts" />
/// <reference path="../core/net.ts" />

/**
 * Created by hoggeg on 19/08/2016.
 */

namespace fugazi.proxyframe {
	export interface Message {
		id: string;
		type: string;
	}

	export var MessageTypes = {
		ProxyFrameHandshake: "remoteproxyframehandshakemessage",
		ProxyFrameHandshakeAck: "remoteproxyframehandshakemessageack",
		ProxyFrameExecuteCommandRequest: "remoteproxyframeexecutecommandrequest",
		ProxyFrameExecuteCommandResponse: "remoteproxyframeexecutecommandresponse"
	};

	export interface RemoteProxyHandshakeMessage {
		frameId: string;
		frameOrigin: string;
	}

	export interface RemoteProxyExecuteCommandRequest {
		method: net.HttpMethod;
		url: string;
		headers: collections.Map<string> | fugazi.PlainObject<string>;
		data?: string | fugazi.PlainObject<any>;
	}

	export interface RemoteProxyExecuteCommandResponse {
		requestId: string;
		statusCode: number;
		headers: collections.Map<string> | fugazi.PlainObject<string>;
		contentType: string,
		httpStatus: number,
		httpStatusText: string,
		status: "ok" | "error";
		data: string;
	}

	export function baseMessageHandler(message: MessageEvent, origin?: string): any {
		let data;

		if (origin && message.origin !== origin) {
			throw new Exception("illegal origin");
		}

		try {
			data = JSON.parse(message.data);
		} catch (e) {
			throw new Exception("invalid message payload");
		}

		if (typeof(data.id) !== "string" && typeof(data.type) !== "string") {
			throw new Exception("unknown type");
		}

		return data;
	}
}
