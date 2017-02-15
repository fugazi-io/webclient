# Commands

A command represents a callable action and can be either local or remote. 
Commands can accept arguments and can return a value as a result.  
A general command descriptor looks like:
```json
{
	// ...
	"commandName": {
		"title": "Command Name",
		"returns": "type of return value, or void if not used",
		"syntax": [ "syntax rules for command execution" ],
		"async": false // or true
	}
}
```
More detailed information can be found in the [command descriptors](../descriptors/command.md).

----

## Syntax
Each command has its' own syntax, which is declared in the command descriptor.  
The syntax is composed from a series of keywords and parameters which are divided by space.  

### Keywords
A keyword is a constant string that must not start with a digit, and cannot contain the following chars: 
* quote (`'`) or double quote (`"`)
* any type of brackets (`(`, `)`, `[`, `]`, `{`, `}`)
* comma (`,`) or colon (`:`)

(It's best not to use other non-alphanumeric characters as they might turn into illegal chars in the future)

A syntax rule can contain only keywords, examples:
```json
{
	...
	"syntax": [
		"say hi",
		"say hello"
	]
}
```

### Parameters
A parameter is a definition of the value that the command expects.  
This definition consists of the name and type for the parameter.  

**Name**  
For now the parameter name has no restrictions, but that may change in the future, so be reasonable.

**Type**  
Referencing a [type](types.md) is usually done using it's full path, i.e.: `amodule.submodule.atype`, unless the type:
* is a [core type](../builtins/types.md#iofugazicore)
* part of the same module as the command (can be in any level of the module)

Examples:
```json
{
	...
	"syntax": [
		"say (word string)",
		"say (words list)"
	]
}
```

And you can use [constraints](constraints.md) and generics (not structs):
```json
{
	...
	"syntax": [
		"say (word string[enum hi hey])",
		"say (words list<string>)"
	]
}
```

----

## Return Type
Pretty much the same rules as the ones applied to the parameter type.  
Examples:
```json
{
	...
	"returns": "map<string[strings.minLength 4]>"
}
```

----

## Local Commands
Local commands are javascript functions which are executed in the browser.  

### Local Handler
The local command handler is a function that is invoked when the user inputs a line matching the command's 
syntax.  
The function needs to match one of the following signatures:
```typescript
(context: fugazi.app.modules.ModuleContext, ...args?: any[]) => fugazi.components.commands.handler.Result;
(context: fugazi.app.modules.ModuleContext, ...args?: any[]) => Promise<fugazi.components.commands.handler.Result>;
```
Where the first is for synced commands and the second for asynced commands.  
The `args` form depends on the `parametersForm` property.

### The Context
All local commands receive the context object as the first argument.  
This object can be used to store and retrieve data between different commands executions, this is useful 
for more complex modules which maintain a state.

### Parameters Form
The handler function can receive it's arguments in one of several forms:
* **list:**  
The arguments are received as a javascript array in the order of parameter definitions in the syntax rule
* **arguments:**  
The arguments are received as regular javascript function arguments in the order of parameter definitions in the syntax rule
* **map:**  
The arguments are received as a `fugazi.collections.Map` which stores them by their parameter names
* **struct:**:  
The arguments are received as regular javascript object, similar to `map` but with a different implementation

### Examples:
Synced command with `parametersForm = "arguments"`
```typescript
{
	// ...
	mycommand: {
		// ...
		syntax: "(a number) + (b number)",
		returns: "number",
		parametersForm: "arguments",
		handler: (context: fugazi.app.modules.ModuleContext, a: number, b: number): fugazi.components.commands.handler.Result => {
			if (typeof a !== "number") { // not needed as fugazi validates input
				return {
					status: fugazi.components.commands.handler.ResultStatus.Failure,
					error: "arguments must be numbers"
				}
			}
			return {
				status: fugazi.components.commands.handler.ResultStatus.Success,
				value: a + b
			};
		}
	}
}
```

Asynced command with `parametersForm = "map"`
```typescript
{
	// ...
	mycommand: {
		// ...
		syntax: "(a number) + (b number)",
		returns: "number",
		parametersForm: "map",
		handler: (context: fugazi.app.modules.ModuleContext, args: fugazi.collections.Map<number>): Promise<fugazi.components.commands.handler.Result> => {
			return new Promise(resolve => {
				resolve({
					status: fugazi.components.commands.handler.ResultStatus.Success,
					value: args.get("a") + args.get("b")
				});
			});
		}
	}
}
```

----

## Remote Commands
Remote commands do not need a local implementation like the local commands, they have a builtin implementation 
which issues an http request and processes the response based on the `endpoint` and `method`:

### Endpoint
This definition needs to be the relative path for this command. 
The full endpoint path will be created using the ancestors hierarchy.

The `endpoint` should **not** include the querystring part, it will be generated automatically for `GET` requests.  
Path parameters are supported though:
```json
{
	// ...
	"mycommand" {
		// ...
		"syntax": "get object (objectid string) for user (userid string) since (date string)",
		"handler": {
			"endpoint": "/p1/p2/{userid }/{ objectid }"
		}
	}
}
```
In this example both `objectid` and `userid` will be added to the endpoint url and won't be sent as part of 
the parameters values, only `date` will.

### Method
The regular http methods, with `GET` as default.

**For `GET`:**  
All parameter names and values are uri encoded and concatenated into a single querystring

**For `POST`:**
The parameters are being encoded using `JSON.stringify` and sent as the request body.  
It might be nice to be able to control how the data is sent, along with the content type header, and it 
will probably be added in the future.
