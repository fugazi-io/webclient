/// <reference path="../../../../scripts/bin/core/net.d.ts" />

/// <reference path="../../../../scripts/bin/components/components.d.ts" />

/**
 * Created by nitzan on 05/05/2016.
 */

(function(): void {
	interface HttpResponse {
		status: number;
		data: any;
	}

	function httpRequest(context: fugazi.app.modules.ModuleContext, params: fugazi.collections.Map<any>): Promise<HttpResponse> {
		let future = new fugazi.Future<HttpResponse>(),
			data: string | fugazi.collections.Map<any> = params.get("data"),
			props: fugazi.net.RequestProperties = {
				cors: true,
				url: params.get("url"),
				method: fugazi.net.stringToHttpMethod(params.get("method")),
				contentType: fugazi.net.ContentTypes.fromString(params.get("contentType")),
				headers: params.get("headers"),
				timeout: params.get("timeout")
			};

		if (params.get("contentType") === "json") {
			props.contentType = fugazi.net.ContentTypes.Json;
		} else if (params.get("contentType") === "multipart") {
			props.contentType = fugazi.net.ContentTypes.Form.Multipart;
		} else if (params.get("contentType") === "urlEncoded") {
			props.contentType = fugazi.net.ContentTypes.Form.UrlEncoded;
		}

		fugazi.net.http(props).success(response => {
			future.resolve({
				status: response.getStatusCode(),
				data: response.getData()
			});
		}).fail(response => {
			future.reject(new fugazi.Exception(`http request failed (${ response.getStatus() }): ${ response.getData() }`));
		}).send(data);

		return future.asPromise();
	}

	function httpRequestByMethod(method: fugazi.net.HttpMethod, context: fugazi.app.modules.ModuleContext, params: fugazi.collections.Map<any>) {
		params.set("method", fugazi.net.httpMethodToString(method));
		return httpRequest(context, params);
	}

	let httpRequestByMethodSyntax = (method: string) => {
		return [
				`${ method } (url url)`,

				`${ method } (url url) (data string)`,
				`${ method } (url url) (data map)`,

				`${ method } (url url) (data string) (contentType contentType)`,
				`${ method } (url url) (data map) (contentType contentType)`,

				`${ method } (url url) (data string) (headers map)`,
				`${ method } (url url) (data map) (headers map)`,

				`${ method } (url url) (data string) (timeout number[numbers.integer])`,
				`${ method } (url url) (data map) (timeout number[numbers.integer])`,

				`${ method } (url url) (data string) (contentType contentType) (headers map)`,
				`${ method } (url url) (data map) (contentType contentType) (headers map)`,

				`${ method } (url url) (data string) (contentType contentType) (timeout number[numbers.integer])`,
				`${ method } (url url) (data map) (contentType contentType) (timeout number[numbers.integer])`,

				`${ method } (url url) (data string) (headers map) (timeout number[numbers.integer])`,
				`${ method } (url url) (data map) (headers map) (timeout number[numbers.integer])`,

				`${ method } (url url) (data string) (contentType contentType) (headers map) (timeout number[numbers.integer])`,
				`${ method } (url url) (data map) (contentType contentType) (headers map) (timeout number[numbers.integer])`
			];
		};

	fugazi.components.modules.descriptor.loaded(<fugazi.components.modules.descriptor.Descriptor> {
		name: "io.fugazi.net.http",
		commands: {
			http: {
				title: "Http Request",
				async: true,
				returns: "response",
				parametersForm: "map",
				handler: httpRequest,
				syntax: [
					"http (url url) (method method)",

					"http (url url) (method method) (data string)",
					"http (url url) (method method) (data map)",

					"http (url url) (method method) (data string) (contentType contentType)",
					"http (url url) (method method) (data map) (contentType contentType)",

					"http (url url) (method method) (data string) (headers map)",
					"http (url url) (method method) (data map) (headers map)",

					"http (url url) (method method) (data string) (timeout number[numbers.integer])",
					"http (url url) (method method) (data map) (timeout number[numbers.integer])",

					"http (url url) (method method) (data string) (contentType contentType) (headers map)",
					"http (url url) (method method) (data map) (contentType contentType) (headers map)",

					"http (url url) (method method) (data string) (contentType contentType) (timeout number[numbers.integer])",
					"http (url url) (method method) (data map) (contentType contentType) (timeout number[numbers.integer])",

					"http (url url) (method method) (data string) (headers map) (timeout number[numbers.integer])",
					"http (url url) (method method) (data map) (headers map) (timeout number[numbers.integer])",

					"http (url url) (method method) (data string) (contentType contentType) (headers map) (timeout number[numbers.integer])",
					"http (url url) (method method) (data map) (contentType contentType) (headers map) (timeout number[numbers.integer])"
				]
			},
			post: {
				title: "Http POST Request",
				async: true,
				returns: "response",
				parametersForm: "map",
				handler: httpRequestByMethod.bind(null, fugazi.net.HttpMethod.Post),
				syntax: httpRequestByMethodSyntax("post")
			},
			"get": {
				title: "Http GET Request",
				async: true,
				returns: "response",
				parametersForm: "map",
				handler: httpRequestByMethod.bind(null, fugazi.net.HttpMethod.Get),
				syntax: httpRequestByMethodSyntax("get")
			},
			"delete": {
				title: "Http DELETE Request",
				async: true,
				returns: "response",
				parametersForm: "map",
				handler: httpRequestByMethod.bind(null, fugazi.net.HttpMethod.Delete),
				syntax: httpRequestByMethodSyntax("delete")
			}
		}
	});
})();