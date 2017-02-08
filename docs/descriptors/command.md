# Command Descriptor

## Interfaces
```typescript
enum ResultStatus {
	Success,
	Failure
}
  
interface CommandResult {
	status: ResultStatus;
	value?: any;
	error?: string;
}
  
interface CommandHandler extends Function {}
  
interface SyncedCommandHandler extends CommandHandler {
	(context: app.modules.ModuleContext, ...params: any[]): CommandResult;
}
  
interface AsyncedCommandHandler extends CommandHandler {
	(context: app.modules.ModuleContext, ...params: any[]): Promise<CommandResult>;
}
  
interface CommandDescriptor extends ComponentDescriptor {
	returns: types.TypeDefinition;
	convert?: {
		from: string;
		converter?: string;
	};
	syntax: string | string[];
	async?: boolean;
}
  
interface LocalCommandDescriptor extends CommandDescriptor {
	handler: CommandHandler;
	parametersForm?: "list" | "arguments" | "map" | "struct";
}
  
interface RemoteCommandDescriptor extends CommandDescriptor {
	handler: {
		endpoint: string;
		method?: string;
	}
}
```
	
## Properties
#### CommandResult
* status
	* `required`
	* `ResultStatus`
	
	The status for the execution

* value
	* `optional`
	* `any`
	
	The result of the execution in case of success.

* error
	* `optional`
	* `string`
	
	An error message in case of failure.
	
#### CommandDescriptor
* returns
	* `required`
	* `StringTypeDefinition`
	
	The type definition of the value of successful executions.
	
* convert
	* `optionl`
	
	If the command execution (locally or remotely) needs to be converted specify the type of the result (`from`) 
	and the name of the converter to use.  
	The converter is optional, if not included a converter that is suited will be looked up.

* syntax
	* `required`
	* `array` of `string`
	
	An array of syntax rules which will be used to execute this command.

* async
	* `optional`
	* `boolean`
	
	Whether or not this command execution is asynced, default to `false`.

#### LocalCommandDescriptor
* handler
	* `required`
	* `function`
	
	The javascript function which will be executed per invocation of this command.  
	In case of `synced` commands the handler function should return the value wrapped 
		in a `CommandResult`.  
	Remote command handlers need to return a `Promise` to a `CommandResult`.

* parametersForm
	* `optional`
	* `string`
	
	Specify the way the javascript function receives the parameters.  
	The options are:
	* "list": the function will receive all params in an array
	* "arguments": the function will receive the params as regular js named params
	* "map": the function will receive the params in the fugazi `Map` type
	* "struct": the function will receive the params in a simple js object.
	
	Defaults to `arguments`.
	
#### RemoteCommandDescriptor
* handler.endpoint
	* `required`
	* `string`
	
	The url path to be added to the base url in order to make a request to this command endpoint.
	
* handler.method
	* `optional`
	* `string`
	
	The HTTP method to be used when making the request.  
	Possible values are the supported methods defined by the HTTP protocol (`GET`, `POST`, `DELETE`, etc) 
		in lower or upper case.  
	Defaults to `GET`.