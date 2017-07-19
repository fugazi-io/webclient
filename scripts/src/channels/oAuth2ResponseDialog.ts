/// <reference path="protocol.ts" />

/**
 * Created by nitzan on 18/07/2017.
 */

namespace fugazi.channels.dialogs.oAuth2Response {
	const channel = new dialogs.OpenerChannel();
	channel.sendMessage(MessageTypes.CloseDialog);
}