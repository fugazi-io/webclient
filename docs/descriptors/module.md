# Module Descriptor

## Interface
	interface ModuleDescriptor extends ComponentDescriptor {
		endpoint?: url;
		proxyframe?: url;
		modules?: Array<ModuleDescriptor> | Map<ModuleDescriptor>;
		types?: url | Array<TypeDescriptor> | Map<TypeDescriptor>;
		commands?: url | Array<CommandDescriptor> | Map<CommandDescriptor>;
		converters?: url | Array<ConverterDescriptor> | Map<ConverterDescriptor>;
		constraints?: url | Array<ConstraintDescriptor> | Map<ConstraintDescriptor>;
	}

## Properties
* endpoint
	* `optional`
	* `string`
	
	The base url for all remote commands under this module

* proxyframe
	* `optional`
	* `string`
	
	Required only if serving remote requests which don't support `CORS` ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) | [Wikipedia](https://www.wikiwand.com/en/Cross-origin_resource_sharing)).  
	The path relative to the endpoint which serves the source for the proxy frame.
	

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

