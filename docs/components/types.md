# Types

The type system is based on the following primitives:
* [number](../builtins/types.md#boolean)
* [string](../builtins/types.md#string)
* [boolean](../builtins/types.md#boolean)

There are two collection types:
* [map](../builtins/types.md#map)
* [list](../builtins/types.md#list)

And two special types:
* [any](../builtins/types.md#any)
* [void](../builtins/types.md#void)

New types can be defined using a combination of these core types and [constraints](constraints.md).  
Examples:
```json
{
	...
	"types": {
		"integer": "number[numbers.integer]",
		"positive": "number[numbers.positive]",
		"longstring": "string[strings.minLength 150]",
		"state": "string[enum on off]"
	}
}
```

----

## Generics
The collection types can have a generic constraint:
```json
{
	...
	"types": {
		"strings": "list<string>",
		"longstrings": "list<string[strings.minLength 150]>",
		"numbers": "map<number>",
		"floats": "map<number[numbers.float]>"
	}
```

----

## Structs
A map that has a specific set of keys, but the definition is different:
```json
{
	...
	"types": {
		"name": "string[strings.between 2 15]",
		"user": {
			"id": "string[strings.exactLength 32]"
			"username": "string[strings.between 5 20]",
			"name": {
				"first": "name",
				"last": "name"
			}
		}
	}
```