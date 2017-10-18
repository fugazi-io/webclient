import * as net from "../core/net";
import * as utils from "../core/utils";
import * as proto from "./protocol";
import "./global";

function respond(requestId: string, result: net.HttpResponse, error: net.HttpResponse) {
	let chosenResponse, status;
	if (error) {
		status = "error";
		chosenResponse = error;
	} else {
		status = "ok";
		chosenResponse = result;
	}

	postMessage({
		id: utils.generateId({min: 5, max: 10}),
		type: proto.MessageTypes.ProxyFrameExecuteCommandResponse,
		data: {
			requestId: requestId,
			status: status,
			statusCode: chosenResponse.getStatusCode(),
			contentType: chosenResponse.getContentType(),
			httpStatus: chosenResponse.getHttpStatus(),
			httpStatusText: chosenResponse.getHttpStatus(),
			data: chosenResponse.getData()
		} as proto.RemoteProxyExecuteCommandResponse
	});
}

function request(requestId: string, message: proto.RemoteProxyExecuteCommandRequest): void {
	net.http({
		headers: message.headers,
		method: message.method,
		url: message.url
	}).success(response => {
		respond(requestId, response, null);
	})
		.fail(response => {
			respond(requestId, null, response);
		})
		.send(message.data);
}

function messageHandler(envelope: MessageEvent): void {
	let message;
	try {
		message = proto.baseMessageHandler(envelope, window.proxyData.parentOrigin);
	} catch (e) {
		return;
	}

	switch (message.type) {
		case proto.MessageTypes.ProxyFrameHandshakeAck:
			console.log("[proxyframe] handshake ack");
			break;

		case proto.MessageTypes.ProxyFrameExecuteCommandRequest:
			request(message.id, message.data);
			break;
	}
}

function postMessage<T extends proto.Message>(message: T) {
	parent.postMessage(JSON.stringify(message), window.proxyData.parentOrigin);
}

function init(): void {
	if (!window.proxyData || !window.proxyData.id || !window.proxyData.parentOrigin) {
		return;
	}

	window.addEventListener("message", messageHandler);

	let message = {
		id: utils.generateId({min: 5, max: 10}),
		type: proto.MessageTypes.ProxyFrameHandshake,
		data: {
			frameId: window.proxyData.id,
			frameOrigin: window.location.origin
		}
	};

	setTimeout(() => {
		console.log("[proxyframe] posting handshake message");
		postMessage(message);
	}, 200);
}

//dom.ready(init);
setTimeout(init, 50);
