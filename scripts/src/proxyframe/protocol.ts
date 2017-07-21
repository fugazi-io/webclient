import * as collections from "../core/types.collections";
import * as types from "../core/types";
import * as net from "../core/net";

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
	headers: collections.Map<string> | types.PlainObject<string>;
	data?: string | types.PlainObject<any>;
}

export interface RemoteProxyExecuteCommandResponse {
	requestId: string;
	statusCode: number;
	headers: collections.Map<string> | types.PlainObject<string>;
	contentType: string,
	httpStatus: number,
	httpStatusText: string,
	status: "ok" | "error";
	data: string;
}

export function baseMessageHandler(message: MessageEvent, origin?: string): any {
	let data;

	if (origin && message.origin !== origin) {
		throw new types.Exception("illegal origin");
	}

	try {
		data = JSON.parse(message.data);
	} catch (e) {
		throw new types.Exception("invalid message payload");
	}

	if (typeof(data.id) !== "string" && typeof(data.type) !== "string") {
		throw new types.Exception("unknown type");
	}

	return data;
}
