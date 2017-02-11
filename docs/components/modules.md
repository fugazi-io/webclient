# Modules

A module aggregates other [components](./components.md) to form a scoped unit, and needs to follow the 
[module descriptor](../descriptors/module.md).  
Examples of existing modules:
* [The simple math module](../../modules/scripts/src/math.ts)
* [The base fugazi module](../../modules/jsons/base.json)

## Characteristics
and can have one or more 
of the following characteristics:
* [Local](#local-module)
* [Remote](#remote-module)
* [Root](#root-module)

### Local Module
A module is considered local if it has at least one local command, either directly or in inner modules.  
Example:
```javascript
let module = {
	name: "mymodule",
	title: "My Module",
	commands: {
		sayhi: {
			title: "Say Hi",
			returns: "ui.message",
			syntax: "say hi",
			handler: function() {
				return "hi!";
			}
		}
	}
}
```

### Remote Module
A module containing a remote configuration or a descendant of such module.  
Example:
```json
{
	"name": "mymodule",
	"title": "My Module",
	"remote": {
		"origin": "//mydomain.com/",
		"base": "mymodule/"
	}
}
```

### Root Module
The first module which meets at least one of the following:
* contains a remote configuration
* has at least one component which isn't a module
* contains two or more modules

Examples:  
Here the root module is: `mymodule.moduleone`
```json
{
	"name": "mymodule",
	"modules": {
		"moduleone": {
			"types": {
				"mytype": "string"
			}
		}
	}
}
```
Which is the same as:
```json
{
	"name": "mymodule.moduleone",
		"types": {
			"mytype": "string"
		}
}
```

## Loading
A module can be loaded in one of two ways:
* [Http](#json-format) 
* [Script](#javascript-format)

### Json Format
A json descriptor has to be a valid json file, and has to end with `.json`.  
Modules which are loaded as json can not contain the following components:
* Local Commands
* Type Converters
* Type Constraints

These components can be [referenced](#referencing-other-descriptors).  
Examples:
```json
{
	"name": "mymodule",
	"title": "My Module",
	"remote": {
		// ...
	},
	"types": {
		// ...
	},
	"commands": { 
		// ...
	}
}
```

### Javascript Format
A javascript module needs to be a valid javascript file which can run in the browser.  
The code shouldn't rely on any 3rd party library, and has to have the following format:
```javascript
(function() {
	// your code here
	
	fugazi.components.modules.descriptor.loaded({
		name: "mymodule",
		title: "My Module",
		// ...
	});
})();
```

## Referencing other descriptors
A module can reference other modules or "partial modules".  
When referencing the collection needs to be an array instead of an object:
```json
{
	"name": "mymodule",
	"modules": [
		"http://mydomain.com/othermodule.json",
		"../anothermodule.js"
	],
	"constraints": "../myconstraints.js"
}
```

### Partial Module
The descriptors which are referenced, if they are not a new module, should only contain the name of the 
 module which referenced them and their addition, they shouldn't contain `title` nor `description`.  
Example:
```json
{
	"name": "mymodule",
	"modules": {
		"othermodule": {
			"title": "Other Module",
			"types": "../mytypes.js"
		}
	}
}
```
Then `mytypes.js` needs to look like this:
```json
{
	"name": "mymodule.othermodule",
	"types": {
		// ...
	}
}	
```