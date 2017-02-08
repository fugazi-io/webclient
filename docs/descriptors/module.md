# Module Descriptor

## Interfaces
```typescript
interface RemoteSourceDescriptor {
	base?: string;
	proxy?: string;
	default?: string;
	auth?: "none" | "basic";
	origin?: string;
	origins?: { [name: string]: string };
}
  
interface RemoteRelativeDescriptor {
	path: string;
}
  
interface ModuleDescriptor extends ComponentDescriptor {
	remote?: RemoteSourceDescriptor | RemoteRelativeDescriptor;
	lookup?: { [name: string]: string };
	modules?: Array<ModuleDescriptor> | Map<ModuleDescriptor>;
	types?: url | Array<TypeDescriptor> | Map<TypeDescriptor>;
	commands?: url | Array<CommandDescriptor> | Map<CommandDescriptor>;
	converters?: url | Array<ConverterDescriptor> | Map<ConverterDescriptor>;
	constraints?: url | Array<ConstraintDescriptor> | Map<ConstraintDescriptor>;
}
```

## Properties
#### RemoteSourceDescriptor
* base
	* `optional`
	* `string`
	
	The base path which should be added to the origin for all requests.
	
* proxy
	* `optional`
	* `string`
	
	Required only if serving remote requests which don't support `CORS` ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) | [Wikipedia](https://www.wikiwand.com/en/Cross-origin_resource_sharing)).  
	The path relative to the endpoint which serves the source for the proxy frame.
	
* default
	* `optional`
	* `string`
	
	The name of the default origin to use.  
	If not specified then the first one is assumed to be the default.
	
* auth
	* `optional`
	* `none` | `basic`
	
	Should http requests be authenticated.  
	Currently only basic authentication is supported.
	
* origin
	* `optional`
	* `string`
	
	The base url to which all http requests from this module will be issued.
	
* origins
	* `optional`
	* `map` of name (`string`) to origin (`string`)
	
	The base urls to which all http requests from this module will be issued.
	
#### RemoteRelativeDescriptor
* path
	* `required`
	* `string`
	
	The url path addition to add to all http requests in this module.

#### ModuleDescriptor
* remote
	* `optional`
	* `RemoteSourceDescriptor` or `RemoteRelativeDescriptor`
	
	The http endpoints configuration

* modules
	* `optional`
	* `array` or `map` of `ModuleDescriptor`
	
	A collection of inner modules, in case of `map` the key will be used as the inner module name

* types
	* `optional`
	* `string` or `array` or `map` of `TypeDescriptor`
	
	A collection of module types.
	
	When a `string` is used the types will be loaded from a different descriptor.  
	If a relative pass is used then it will be relative to the url of the containing descriptor.  
	The descriptor will be loaded as a json using a http request.
	
	If a `map` is used then the key will be used as the type name.
	

* commands
	* `optional`
	* `string` or `array` or `map` of `CommandDescriptor`
	
	A collection of module commands.
	
	When a `string` is used the types will be loaded from a different descriptor.  
	If a relative pass is used then it will be relative to the url of the containing descriptor.
	The descriptor will be loaded as `javascript` using the `script` tag.
	
	If a `map` is used then the key will be used as the command name.
	
* converters
	* `optional`
	* `string` or `array` or `map` of `ConverterDescriptor`
	
	A collection of module converters.
	
	When a `string` is used the types will be loaded from a different descriptor.  
	If a relative pass is used then it will be relative to the url of the containing descriptor.  
	The descriptor will be loaded as `javascript` using the `script` tag.
	
	If a `map` is used then the key will be used as the converter name.
	

* constraints
	* `optional`
	* `string` or `array` or `map` of `ConstraintDescriptor`
	
	A collection of module constraints.
	
	When a `string` is used the types will be loaded from a different descriptor.  
	If a relative pass is used then it will be relative to the url of the containing descriptor.
	The descriptor will be loaded as `javascript` using the `script` tag.
	
	If a `map` is used then the key will be used as the constraint name.

