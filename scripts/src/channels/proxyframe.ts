/// <reference path="../core/dom.ts" />
/// <reference path="../core/types.ts" />
/// <reference path="../core/net.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="protocol.ts" />

/**
 * Created by nitzan on 13/07/2016.
 */

namespace fugazi.channels.frames.proxyframe {
	let channel;

	function respond(requestId: string, result: net.HttpResponse, error: net.HttpResponse) {
		let chosenResponse, status;
		if (error) {
			status = "error";
			chosenResponse = error;
		} else {
			status = "ok";
			chosenResponse = result;
		}

		channel.sendMessage(frames.proxy.MessageTypes.ExecuteCommandResponse, {
			requestId: requestId,
			status: status,
			statusCode: chosenResponse.getStatusCode(),
			contentType: chosenResponse.getContentType(),
			httpStatus: chosenResponse.getHttpStatus(),
			httpStatusText: chosenResponse.getHttpStatus(),
			data: chosenResponse.getData()
		} as frames.proxy.ExecuteCommandResponsePayload);
	}

	function request(message: ChannelMessage<frames.proxy.ExecuteCommandRequestPayload>): void {
		net.http({
			headers: message.payload.headers,
			method: message.payload.method,
			url: message.payload.url
		}).success(response => {
			respond(message.id, response, null);
		})
		.fail(response => {
			respond(message.id, null, response);
		})
		.send(message.payload.data);
	}

	setTimeout(() => {
		channels.init();
		channel = new frames.FrameParentChannel();
		channel.register(frames.proxy.MessageTypes.ExecuteCommandRequest, request);
	}, 100);
}