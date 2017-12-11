### fugazi is a web client for command execution based on user-defined syntax

We'll start with how to focus and scroll long output results (such as this one).  
The default scrolling behaviour is set to the entire output panel, in order to gain "scrolling focus" 
on a result simply click anywhere on the result and scroll away.  
To return the focus to the main output panel simply double click the focused result or click anywhere else in the output panel.  
You'll then be able to focus on another result if you wish.

And now that we've got that out of the way:

The fugazi client fully "understands" the commands, in that it knows about the command syntax, 
the parameters it expects (how many, what types, how are they named) and the type of the result.  
Using this knowledge the client can validate input (and output), compare values, use command 
output as another commands' input (nested commands) and of course handle errors.  

#### Variables
The client supports variables which can assigned to any value or a command result and then be used as another commands' input.  
(run `help vars` for more info)

#### Extending the functionality
The client can be extended by loading modules which enrich its functionality with:

 * Commands (run `help commands` for more info)
 * Syntax (run `help syntax` for more info)
 * Types (run `help types` for more info)
 * Type Constraints (run `help constraints` for more info)
 * Type Converters (run `help converters` for more info)

#### UI
The UI offers the following:

 * Suggestions of relevant commands based on user input (run `help suggestions` for more info)
 * Used commands history (run `help history` for more info)
 * Used command search (run `help search` for more info)
 
#### man
In addition to the `help` commands, another useful command (especially if this is your first time here) is the **manual** 
command which is ran using `man COMMAND_NAME`.  
Examples:
```fugazi-command
man manual
```
```fugazi-command
man http
```

It can be used on other components other than commands by specifying the component path.  
Examples:
```fugazi-command
man "io.fugazi"
```
