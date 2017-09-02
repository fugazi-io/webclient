/// <reference path="./application.ts" />
/// <reference path="../channels/protocol.ts" />

/**
 * Created by nitzan on 22/07/2017.
 */

namespace fugazi.app.dialogs {
	export class DialogChannel extends channels.Channel {
		private source: net.Url;
		private element: Window;

		constructor(id: string, source: net.Url, element: Window) {
			super(id, source.origin, element);

			this.source = source;
			this.element = element;

			this.register(channels.dialogs.MessageTypes.CloseDialog, () => {
				this.element.close();
			});
		}

		public static from<T>(this: { new(id: string, source: net.Url, element: Window): T }, source: net.Url): Promise<T> {
			/*const id = utils.generateId({ max: 15, min: 8 });
			const features = "menubar=no,location=yes,resizable=yes,scrollbars=yes,status=yes,height=200,width=200";
			let redirectUri = new net.Url(decodeURIComponent(source.getParam("redirect_uri")));
			redirectUri = channels.createUrlWithData(redirectUri, id);
			source.addParam("redirect_uri", redirectUri.toString(), true);
			const element = window.open(source.toString(), "Authenticate", features);
			return Promise.resolve(new this(id, source, element));*/

			const id = utils.generateId({ max: 15, min: 8 });
			const features = "menubar=no,location=yes,resizable=yes,scrollbars=yes,status=yes,height=200,width=200";
			source.addParam("state", JSON.stringify(channels.createUrlData(id)), true);
			const element = window.open(source.toString(), "Authenticate", features);
			return Promise.resolve(new this(id, source, element));
		}
	}

	export class OAuth2DialogChannel extends DialogChannel {
		private static getProxiedSource(source: net.Url): net.Url {
			const redirectUri = source.getParam("redirect_uri");
			return new net.Url(decodeURIComponent(redirectUri));
		}

		constructor(id: string, source: net.Url, element: Window) {
			super(id, OAuth2DialogChannel.getProxiedSource(source), element);
		}
	}

	// init
	app.bus.register(app.Events.Loaded, () => {
		channels.init();
	});
}
