# fugazi.io 

A web based terminal application for executing local and remote commands.  
The latest version of the terminal can be found here: http://fugazi.io

Unfortunately there's no form of documentation, we're aware of the problem and are working on it.  
For now a few usage examples for the terminal are documented below.

While using the terminal you can get command suggestions which are based on your input by pressing the `tab` key. To exit this mode click `tab` again or `esc`.

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

#### List
Outputs the list of different component types in different modules  
Syntax:
```
list modules
list modules in MODULE_PATH
list types in MODULE_PATH
list commands in MODULE_PATH
list converters in MODULE_PATH
list constraints in MODULE_PATH
```
Examples:
```
list modules
list modules in "io.fugazi"
list types in "io.fugazi.core"
```

#### Load
Loads a module from a url.  
Urls must end with either `.json` or `.js`.  
Syntax: `load module from URL`  
Examples:
```
load module from "http://fugazi.io/modules/scripts/bin/math.js"
```
