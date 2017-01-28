/// <reference path="../../lib/lz-string.d.ts" />

"use strict";

module fugazi.app.storage {
	export var local: Storage;

	export interface StorageProperties {
		useCompression: boolean;
	}

	export abstract class Storage {
		protected properties: StorageProperties;

		public constructor(properties: StorageProperties) {
			this.properties = properties;
		}

		public abstract has(key: string): boolean;
		public abstract delete(key: string): void;
		public abstract store<T>(key: string, value: T): void;
		public abstract fetch<T>(key: string): T;
	}

	class LocalStorage extends Storage {
		public has(key: string) {
			return this.fetch<any>(key) != null;
		}

		public delete(key: string): void {
			localStorage.removeItem(this.properties.useCompression ? compress(key) : key)
		}

		public store<T>(key: string, value: T): void {
			var serializedValue: string = serialize(value)
			if (this.properties.useCompression) {
				localStorage.setItem(compress(key), compress(serializedValue));
			}
			else {
				localStorage.setItem(key, serializedValue)
			}
		}

		public fetch<T>(key: string): T {
			var value: string;
			if (this.properties.useCompression) {
				value = decompress(localStorage.getItem(compress(key)));
			}
			else {
				value = localStorage.getItem(key);
			}

			return <T>deserialize(value);
		}
	}

	function serialize(value: any): string {
		return value === null ? "" : JSON.stringify(value);
	}

	function deserialize(value: string): any {
		return value === null || value.length === 0 ? null : JSON.parse(value);
	}

	function compress(value: string): string {
		return LZString.compressToUTF16(value);
	}

	function decompress(value: string): string {
		return LZString.decompressFromUTF16(value);
	}

	export function initialize(properties: StorageProperties) {
		local = new LocalStorage(properties);
	}

}