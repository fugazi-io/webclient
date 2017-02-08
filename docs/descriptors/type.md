# Type Descriptor

## Interfaces
```typescript
interface TypeDefinition {}

interface StringTypeDefinition extends TypeDefinition, String {}

interface StructTypeDefinition extends TypeDefinition, Object<TypeDefinition> {}

interface TypeDescriptor extends ComponentDescriptor {
	type: TypeDefinition;
}
```
	

## Properties
* type
	* `required`
	* `string` or sturct `object`
	
	The definition of the type.  
	In case of a string it will be parsed to construct the type.  
	When an object a struct type will be constructed.
	
## Examples
#### String
	{
		"name": "email",
		"title": "Email",
		"type": "string[strings.regex '\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b' i]"
	}
	
	{
		"name": "url",
		"title": "Url",
		"type": "string[strings.regex '^(https?|ftp):\/\/[^\\s/$.?#].[^\\s]*$' i]"
	}

#### Struct
	{
		"name": "name",
		"title": "Name",
		"type": "string[min 2]"
	}
	
	{
		"name": "user",
		"title": "User",
		"type": {
			"username": "string[between 5 10]"
			"name": {
				"first": "name",
				"last": "name"
			},
			"email": "io.fugazi.net.email",
			"image": "io.fugazi.net.url"
		}
	}