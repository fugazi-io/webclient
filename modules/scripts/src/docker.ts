/// <reference path="../../../scripts/bin/components/components.d.ts" />
/// <reference path="../../../scripts/bin/components/modules.d.ts" />
/// <reference path="../../../scripts/bin/core/net.d.ts" />

/**
 * Created by nitzan on 03/06/2017.
 */

(function(): void {
	const src = new fugazi.net.Url(new URL((document.currentScript as HTMLScriptElement).src));
	const host = src.getParam("host");
	const port = src.getParam("port");
	const origin = host + (port ? ":" + port : "");

	console.log(origin);

	fugazi.components.modules.descriptor.loaded(<fugazi.components.modules.descriptor.Descriptor> {
		name: "docker",
		title: "docker control",
		remote: {
			origin: origin
		}
	});
})();