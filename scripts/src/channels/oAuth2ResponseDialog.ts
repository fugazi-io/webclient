/// <reference path="protocol.ts" />

/**
 * Created by nitzan on 18/07/2017.
 */

namespace fugazi.channels.dialogs.oAuth2Response {
	channels.init();

	const channel = new dialogs.OpenerChannel();
	channel.register(channels.MessageTypes.HandshakeAck, () => {
		channel.sendMessage(MessageTypes.CloseDialog);
	});
}