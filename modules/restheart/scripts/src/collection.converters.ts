import {BoundConstraintValidator, HttpMethod, Descriptor, ModuleContext, Module, Component, Map, RequestProperties, PrivilegedModuleContext, LoadProperties} from "../../../../scripts/bin/app/modules.api";

type RawCollection = {
	_id: string,
	_returned: number,
	_embedded: {
		_id: {
			$oid: string;
		},
		[name: string]: any;
	}[];
}

type Collection = {
	_id: string,
	documents: {
		_id: string,
		[name: string]: any;
	}[];
}

(function(): void {
	fugazi.loaded({
		name: "restheart.collections",
		converters: {
			RawCollections2Collections: {
				title: "converts RawCollections to Collections",
				input: "RawCollections",
				output: "Collections",
				converter: function(response: { _embedded: { _id: string }[] }): string[] {
					return response._embedded.map(db => db._id);
				}
			},
			RawCollection2Collection: {
				title: "converts RawCollection to Collection",
				input: "RawCollection",
				output: "Collection",
				converter: function(response: RawCollection): Collection {
					return {
						_id: response._id,
						documents: response._embedded.map(rawDocument => {
							const document = Object.assign({}, rawDocument) as any;
							document._id = `ObjectId("${ rawDocument._id.$oid }")`;
							/*const document = {
								_id: `ObjectId("${ rawDocument._id.$oid }")`
							};

							Object.keys(rawDocument).forEach(name => {
								if (name !== "_id") {
									document[name] = rawDocument[name];
								}
							});*/

							return document;
						})
					};
				}
			}
		}
	});
})();
