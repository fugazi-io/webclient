/// <reference path="../core/dom.ts" />
/// <reference path="../core/types.ts" />
/// <reference path="../core/net.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="protocol.ts" />

/**
 * Created by nitzan on 13/07/2016.
 */

interface Window {
	proxyData: fugazi.app.frames.RemoteProxyData;
}

namespace fugazi.proxyframe {
	function respond(requestId: string, result: string, error: string) {
		const data = {
			requestId: requestId
		} as RemoteProxyExecuteCommandResponse;

		if (error) {
			data.status = "error";
			data.error = error;
		} else {
			data.status = "ok";
			data.result = result;
		}

		postMessage({
			id: utils.generateId({ min: 5, max: 10 }),
			type: MessageTypes.ProxyFrameExecuteCommandResponse,
			data: data
		});
	}

	function request(requestId: string, message: RemoteProxyExecuteCommandRequest): void {
		//let future = new Future<components.commands.handler.Result, Exception>();

		net.http({
			method: message.method,
			url: message.url
		}).success(response => {
				respond(requestId, response.getData(), null);
		})
		.fail(response => {
			respond(requestId, null, response.getData());
		})
		.send(message.data);
	}

	function messageHandler(envelope: MessageEvent): void {
		let message;
		try {
			message = baseMessageHandler(envelope, window.proxyData.parentOrigin);
		} catch (e) {
			return;
		}

		switch (message.type) {
			case MessageTypes.ProxyFrameHandshakeAck:
				console.log("[proxyframe] handshake ack");
				break;

			case MessageTypes.ProxyFrameExecuteCommandRequest:
				request(message.id, message.data);
				break;
		}
	}

	function postMessage<T extends Message>(message: T) {
		parent.postMessage(JSON.stringify(message), window.proxyData.parentOrigin);
	}

	function init(): void {
		if (!window.proxyData || !window.proxyData.id || !window.proxyData.parentOrigin) {
			return;
		}

		window.addEventListener("message", messageHandler);

		let message = {
			id: utils.generateId({ min: 5, max: 10 }),
			type: MessageTypes.ProxyFrameHandshake,
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
}