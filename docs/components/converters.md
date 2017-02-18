# Converters

A converter is a javascript function that converts value of one type to a value of a different type.  
The client has an index of converters so it can automatically convert between types if needed.  
This isn't fully implemented (see issue: https://github.com/fugazi-io/webclient/issues/19), for now converters can 
be used when defining commands:
```json
// ...
"command": {
	"title": "Command Name",
	"returns": "TypeA",
	"convert": {
		"from": "TypeB",
		"converter": "TypeB2TypeA"
	},
	// ...
}
```

Examples:
```typescript
// ...
types: {
	user: {
		id: "string",
		username: "string"
	}
},
converters: {
	string2user: {
		"title": "Creates a user from a string representation",
		input: "string",
		output: "user",
		converter: (str: string): { id: string, username: string } => {
			return JSON.parse(str);
		}
	}
}
```