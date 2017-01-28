# fugazi.io 

A web based terminal application for executing local and remote commands.  
The latest version of the terminal can be found here: http://fugazi.io

Unfortunately there's no form of documentation, we're aware of the problem and are working on it.  
For now here are a few usage examples for the terminal:

## Builtin commands
Fugazi comes with a few builtin commands

#### Set
Stores a value into a variable  
Syntax: `set VAR_NAME = VALUE`  
Examples:
```
set a = 4
set a = true
set b = string
set c = "string"
set a = { str: "a string", arr: [1, 3] }
```

#### Echo
Outputs the passed value  
Syntax: `echo VALUE`  
Examples:
```
echo 4
echo "string"
echo string
echo [1, 2, 3]
echo { key: "value", "key2": 4 }
```
With variables:
```
set a = [1, "str", { key: value }]
echo $a
```
