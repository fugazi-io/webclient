
"use strict";

module fugazi.net {
	module HEADERS {
		export var ContentType: string = "Content-Type";
	}

	var DEFAULT_CONTENT_TYPE: ContentType;
	var DEFAULT_METHOD: HttpMethod;
	var CONTENT_TYPES: ContentType[];

	export enum HttpMethod {
		Delete,
		Get,
		Head,
		Post,
		Put,
	}
	DEFAULT_METHOD = HttpMethod.Get;

	export function httpMethodToString(method: HttpMethod): string {
		return HttpMethod[method].toUpperCase();
	}

	export function stringToHttpMethod(str: string): HttpMethod {
		switch (str.toUpperCase()) {
			case "DELETE":
				return HttpMethod.Delete;

			case "GET":
				return HttpMethod.Get;

			case "HEAD":
				return HttpMethod.Head;

			case "POST":
				return HttpMethod.Post;

			case "PUT":
				return HttpMethod.Put;
		}

		return null;
	}

	export class QueryString extends collections.Map<string> {
		constructor(str: string) {
			super();

			if (str.startsWith("?")) {
				str = str.substring(1);
			}

			if (str.indexOf("#") > 0) {
				str = str.substring(0, str.indexOf("#"));
			}

			str.split("&").forEach(param => {
				let parts = param.split("=");
				if (parts.length === 2) {
					this.set(parts[0], parts[1]);
				}
			});
		}

		public toString(): string {
			let result = "";

			this.forEach((value: string, name: string) => {
				result += `&${ name }=${ value }`;
			});

			return result.substring(1);
		}
	}

	export class Url implements URLUtils {
		private url: URL;

		public constructor(url: URL);
		public constructor(path: string, base?: string | Url | URL);
		public constructor(url: string | URL, base?: string | Url | URL) {
			if (url instanceof URL) {
				this.url = url;
			} else {
				if (!base) {
					this.url = new URL(url);
				} else if(base instanceof Url) {
					this.url = new URL(url, base.url.toString());
				}  else if (base instanceof URL) {
					this.url = new URL(url, base.toString());
				} else {
					this.url = new URL(url, base);
				}
			}
		}

		public get hash(): string {
			return this.url.hash;
		}

		public get search(): string {
			return this.url.search;
		}

		public get pathname(): string {
			return this.url.pathname;
		}

		public get port(): string {
			return this.url.port;
		}

		public get hostname(): string {
			return this.url.hostname;
		}

		public get host(): string {
			return this.url.host;
		}

		public get password(): string {
			return this.url.password;
		}

		public get username(): string {
			return this.url.username;
		}

		public get protocol(): string {
			return this.url.protocol;
		}

		public get origin(): string {
			return this.url.origin;
		}

		public get href(): string {
			return this.url.href;
		}

		public get params(): QueryString {
			return new QueryString(this.search);
		}

		public hasParam(name: string): boolean {
			return this.params.has(name);
		}

		public getParam(name: string): string {
			return this.params.get(name);
		}

		public addParam(name: string, value: any, encode: boolean = true): void {
			let params = this.params;

			if (encode) {
				value = encodeURIComponent(value);
			}

			params.set(name, value);
			this.createNewURL(params);
		}

		public setHash(hash: string): void {
			let newUrl = this.href;

			if (newUrl.lastIndexOf("#") > 0) {
				newUrl = newUrl.substring(0, newUrl.lastIndexOf("#"));
			}

			newUrl += "#" + hash;
			this.url = new URL(newUrl);
		}

		public removeParam(name: string): string {
			let value: string,
				params = this.params;

			value = params.remove(name);
			this.createNewURL(params);

			return value;
		}

		public clone(): Url {
			return new Url(this.toString());
		}

		public toString(): string {
			return this.url.toString();
		}

		private createNewURL(params: QueryString): void {
			let newUrl = `${ this.origin }${ this.pathname }?${ params.toString() }`;

			if (this.hash) {
				newUrl += this.hash;
			}

			this.url = new URL(newUrl);
		}
	}

	export enum Status {
		None,
		Success,
		NotModified,
		Timeout,
		Error
	}

	export interface ContentType {}

	export interface FormContentTypeEnum {
		Multipart: ContentType,
		UrlEncoded: ContentType
	}

	export interface ContentTypeEnum {
		Text: ContentType,
		Json: ContentType,
		Form: FormContentTypeEnum,
		None: ContentType,
		fromString: (contentType: string) => ContentType
	}

	export var ContentTypes: ContentTypeEnum = {
		Text: {
			toString: function() {
				return "text/plain";
			}
		},
		Json: {
			toString: function() {
				return "application/json";
			}
		},
		Form: {
			Multipart: {
				toString: function() {
					return "multipart/form-data";
				}
			},
			UrlEncoded: {
				toString: function() {
					return "application/x-www-form-urlencoded";
				}
			}
		},
		None: null,
		fromString: function(contentType: string): ContentType {
			for (let i = 0; i < CONTENT_TYPES.length; i++) {
				if (contentType.toLowerCase().includes(CONTENT_TYPES[i].toString().toLowerCase())) {
					return CONTENT_TYPES[i];
				}
			}

			return ContentTypes.None;
		}
	}

	DEFAULT_CONTENT_TYPE = ContentTypes.Form.UrlEncoded;
	CONTENT_TYPES = [ContentTypes.Text, ContentTypes.Json, ContentTypes.Form.Multipart, ContentTypes.Form.UrlEncoded];

	export interface RequestProperties {
		url: string | Url | URL;
		method?: HttpMethod;
		contentType?: ContentType;
		timeout?: number;
		cors?: boolean;
		headers?: collections.Map<string> | fugazi.PlainObject<string>;
	}

	export interface HttpBase {
		getXHR(): XMLHttpRequest;
		getStatus(): Status;
		getStatusCode(): number;
		getHttpStatus(): number;
		getHttpStatusText(): string;
	}

	export type ResponseHandler = (response: HttpResponse) => void;

	export type RequestData = string | fugazi.PlainObject<any> | collections.Map<any>;

	export interface HttpRequest extends HttpBase {
		getContentType(): ContentType;
		getMethod(): HttpMethod;
		getUrl(): Url;
		getUrlString(): string;
		setHeader(key: string, value: string): void;
		send(data?: RequestData): void;
		success(fn: ResponseHandler): HttpRequest;
		fail(fn: ResponseHandler): HttpRequest;
		complete(fn: ResponseHandler): HttpRequest;
	}

	export interface HttpResponse extends HttpBase {
		isContentType(contentType: string): boolean;
		getContentType(): string;
		getData(): string;
		guessData(): any;
		getDataAsJson(): any;
		getDataAsJson<T>(): T;
		getDataAsMap(): collections.Map<any>;
		getDataAsMap<T>(): collections.Map<T>;
	}

	export function http(properties: RequestProperties): HttpRequest {
		if (properties.method == null) {
			properties.method = DEFAULT_METHOD;
		}

		switch (properties.method) {
			case HttpMethod.Get:
			case HttpMethod.Head:
				return new HttpGetRequestObject(properties);

			case HttpMethod.Post:
			case HttpMethod.Put:
			case HttpMethod.Delete:
				return new HttpPostRequestObject(properties);
		}

		return null;
	}

	export function get(properties: RequestProperties): HttpRequest {
		properties.method = HttpMethod.Get;
		return http(properties);
	}

	export function post(properties: RequestProperties): HttpRequest {
		properties.method = HttpMethod.Post;
		return http(properties);
	}

	abstract class HttpObject implements HttpBase {
		protected xhr: XMLHttpRequest;
		protected statusCode: number;

		public constructor(xhr: XMLHttpRequest) {
			this.xhr = xhr;
			this.statusCode = 0;
		}

		/**
		 * @Override
		 */
		public abstract getContentType(): ContentType;

		/**
		 * @Override
		 */
		public getXHR(): XMLHttpRequest {
			return this.xhr;
		}

		/**
		 * @Override
		 */
		public getStatus(): Status {
			switch (this.statusCode) {
				case 0:
					return Status.None;

				case 200:
					return Status.Success;

				case 304:
					return Status.NotModified;

				case 408:
					return Status.Timeout;

				default:
					return Status.Error;
			}
		}

		public getStatusCode(): number {
			return this.statusCode;
		}

		/**
		 * @Override
		 */
		public getHttpStatus(): number {
			return this.xhr.status;
		}

		/**
		 * @Override
		 */
		public getHttpStatusText(): string {
			return this.xhr.statusText;
		}
	}

	class HttpRequestObject extends HttpObject implements HttpRequest {
		protected url: Url;
		protected timeout: number;
		protected method: HttpMethod;
		protected headers: collections.Map<string>;
		protected future: fugazi.Future<HttpResponse>;

		constructor(properties: RequestProperties) {
			super(new XMLHttpRequest());

			this.url = fugazi.is(properties.url, Url) ? <Url> properties.url : new Url(<string> properties.url);
			this.timeout = properties.timeout;
			this.method = properties.method != null ? properties.method : DEFAULT_METHOD;
			this.headers = collections.map<string>(properties.headers);

			if (properties.contentType) {
				this.headers.set(HEADERS.ContentType, properties.contentType.toString());
			}

			// TODO: handle credentials, using withCredentials = true prevents requests to servers who return Access-Control-Allow-Origin: *
			/*if (fugazi.is(properties.cors, Boolean) && properties.cors) {
				this.xhr.withCredentials = true;
			}*/

			this.future = new fugazi.Future<HttpResponse>();
		}

		public setHeader(key: string, value: string): void {
			this.headers.set(key, value);
		}

		/**
		 * @Override
		 */
		public getContentType(): ContentType {
			return ContentTypes.fromString(this.headers.get(HEADERS.ContentType));
		}

		public getMethod(): HttpMethod {
			return this.method;
		}

		public getUrl(): Url {
			return this.url;
		}

		public getUrlString(): string {
			return this.url.toString();
		}

		public send(data?: string | fugazi.PlainObject<any> | collections.Map<any>): fugazi.Future<HttpResponse> {
			if (fugazi.isPlainObject(data)) {
				data = collections.map<any>(<fugazi.PlainObject<any>> data);
			}

			this.open(data);
			this.processHeaders();
			this.xhr.onreadystatechange = this.handler.bind(this);
			this.processDataAndSend(<string | collections.Map<any>> data);

			if (this.timeout) {
				setTimeout(function(): void {
					if (this.status === Status.None) {
						this.xhr.abort();
					}
				}.bind(this), this.timeout);
			}

			return this.future;
		}

		public success(fn: ResponseHandler): HttpRequest {
			this.future.then(fn);
			return this;
		}

		public fail(fn: ResponseHandler): HttpRequest {
			this.future.catch(fn);
			return this;
		}

		public complete(fn: ResponseHandler): HttpRequest {
			this.future.finally(fn);
			return this;
		}

		protected open(data?: string | fugazi.PlainObject<any> | collections.Map<any>): void {
			this.xhr.open(httpMethodToString(this.method), this.url.toString(), true);
		}

		protected processDataAndSend(data?: string | collections.Map<any>): void  {
			this.xhr.send();
		}

		private handler(event: Event): void {
			var response: HttpResponseObject;

			if (this.xhr.readyState === 4) {
				this.statusCode = this.xhr.status;
				response = new HttpResponseObject(this.xhr, this.statusCode);

				switch (this.statusCode) {
					case 200:
						this.future.resolve(response);
						break;

					default:
						this.future.reject(response);
				}
			}
		}

		private processHeaders(): void {
			this.headers.forEach(function(value: string, key: string): void {
				this.xhr.setRequestHeader(key, value);
			}.bind(this));
		}
	}

	function mapToQueryString(map: collections.Map<any>): string {
		var querystring: string = "";

		map.forEach(<collections.KeyValueIteratorCallback<any>> function(value: any, key: string): void {
			querystring += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(value);
		});

		return querystring.substring(1);
	}

	class HttpGetRequestObject extends HttpRequestObject {
		/**
		 * @Override
		 */
		protected open(data?: string | fugazi.PlainObject<any> | collections.Map<any>): void {
			let params;

			if (!data) {
				super.open(null);
				return
			}

			if (typeof data === "string") {
				params = new QueryString(data);

			} else if (data instanceof collections.Map) {
				params = data;
			} else {
				params = collections.map<any>(data);
			}

			params.forEach((value: string, name: string) => this.url.addParam(name, value));
			this.xhr.open(httpMethodToString(this.method), this.url.toString(), true);
		}
	}

	class HttpPostRequestObject extends HttpRequestObject {
		/**
		 * @Override
		 */
		protected processDataAndSend(data?: string | collections.Map<any>): void  {
			var processed: any;

			if (!data) {
				processed = null;
			} else if (this.getContentType() === ContentTypes.Json) {
				processed = data.toString();
			} else if (this.getContentType() === ContentTypes.Form.Multipart) {
				processed = new FormData();
				(<collections.Map<any>> data).forEach(<collections.KeyValueIteratorCallback<any>> function(value: any, key: string): void {
					(<FormData> processed).append(key, value);
				});
			} else if (this.getContentType() === ContentTypes.Form.UrlEncoded) {
				processed = mapToQueryString(<collections.Map<any>> data);
			} else {
				processed = data.toString();
			}

			this.xhr.send(processed);
		}
	}

	class HttpResponseObject extends HttpObject implements HttpResponse {
		private contentType: string;
		private data: string;

		public constructor(xhr: XMLHttpRequest, statusCode: number) {
			super(xhr);

			this.statusCode = statusCode;
			this.contentType = xhr.getResponseHeader("Content-Type");
			this.data = this.xhr.responseText;
		}

		public isContentType(contentType: string): boolean {
			return this.getContentType().toLowerCase().startsWith(contentType.toLowerCase());
		}

		public getContentType(): string {
			return this.contentType;
		}

		public getData(): string {
			return this.data;
		}

		public guessData(): any {
			const contentType = ContentTypes.fromString(this.contentType);

			if (contentType === ContentTypes.Json) {
				return this.getDataAsJson();
			} else {
				return this.getData();
			}
		}

		/**
		 * @override
		 */
		public getDataAsJson<T>(): any | T {
			try {
				return JSON.parse(this.data);
			} catch (exception) {
				throw new fugazi.Exception("unable to parse response data");
			}
		}

		/**
		 * @override
		 */
		public getDataAsMap<T>(): collections.Map<T> {
			return collections.map<T>(this.getDataAsJson());
		}
	}
}