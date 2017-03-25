### Commands
Commands in fugazi can either ran locally or remotely.  
Local commands have javascript based handlers which are invoked when the command is executed.  
Remote commands are mapped to an http endpoint and issue a request when the command is executed.

In both cases the parameters are validated against the command description, and the result is also validated to math the 
declared return type (for more information about types run `help types`).

In order to run a command you need to write an input that matches the syntax it declared.  
While writing the input you can use the suggestions panel (ran `help suggestions` for more info) and if you want to know 
the syntax for a command run `man COMMAND_NAME`, i.e.:
```fugazi-comand
// command
man http
```

For more built-in commands go to the [build-in commands docs](https://github.com/fugazi-io/webclient/blob/master/docs/builtins/commands.md), 
 or ran `man "io.fguazi`.

You can add more commands to the client by loading modules using the [load command](https://github.com/fugazi-io/webclient/blob/master/docs/builtins/commands.md#load).