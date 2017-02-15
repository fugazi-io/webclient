# Components

The fugazi client is extended using components.  
There are different types of components, currently:
* [Types](./types.md)
* [Modules](./modules.md)
* [Commands](./commands.md)
* [Type Converters](./converters.md)
* [Type Constraints](./constraints.md)

All components share the same [basic descriptor](../descriptors/component.md).

----

## Components name and path
Each component has a path which identifies it. 
This path is simply a concatenation of all the component names of the ancestors.  
For example:
```json
{
	"name": "mymodule",
	"modules": {
		"moduleone": {
			"types": {
				"typeone": { ... },
				"typetwo": { ... }
			}
		},
		"moduletwo": {
			"modulethree": {
				"types": {
					"typeone": { ... }
				}
			}
		}
	},
	"types": {
		"typeone": { ... },
		"typetwo": { ... }
	}
}
```
Here are the paths for the different components in this example:
* `mymodule`
	* `mymodule.moduleone`
		* `mymodule.moduleone.typeone`
		* `mymodule.moduleone.typetwo`
	* `mymodule.moduletwo`
		* `mymodule.moduletwo.modulethree`
			* `mymodule.moduletwo.modulethree.typeone`
	* `mymodule.typeone`
	* `mymodule.typetwo`