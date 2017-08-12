import { Descriptor, HttpMethod, FugaziMap, ModuleContext, RequestProperties } from "../../../../scripts/bin/app/modules.api";

(function (): void {
	interface HttpResponse {
		status: number;
		data: any;
	}

	function httpRequest(context: ModuleContext, params: FugaziMap<any>): Promise<HttpResponse> {
		let future = new fugazi.Future<HttpResponse>(),
			data: string | FugaziMap<any> = params.get("data"),
			props: RequestProperties = {
				cors: true,
				url: params.get("url"),
				method: fugazi.net.stringToHttpMethod(params.get("method")),
				headers: params.get("headers"),
				timeout: params.get("timeout")
			};

		if (params.has("contentType")) {
			props.contentType = fugazi.net.ContentTypes.fromString(params.get("contentType"));
		}

		fugazi.net.http(props).success(response => {
			future.resolve({
				status: response.getStatusCode(),
				data: response.guessData()
			});
		}).fail(response => {
			future.reject(new fugazi.Exception(`http request failed (${ response.getStatus() }): ${ response.getData() }`));
		}).send(data);

		return future.asPromise();
	}

	function httpRequestByMethod(method: HttpMethod, context: ModuleContext, params: FugaziMap<any>) {
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

	fugazi.loaded(<Descriptor> {
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
			get: {
				title: "Http GET Request",
				async: true,
				returns: "response",
				parametersForm: "map",
				handler: httpRequestByMethod.bind(null, fugazi.net.HttpMethod.Get),
				syntax: httpRequestByMethodSyntax("get")
			},
			delete: {
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
