# fugazi.io 

A web based terminal application for executing local and remote commands.  
The latest version of the terminal can be found here: http://fugazi.io

Unfortunately there's no form of documentation, we're aware of the problem and are working on it.  
For now a few usage examples for the terminal are documented below.

While using the terminal you can get command suggestions which are based on your input by pressing the `tab` key. To exit this mode click `TAB` again or `ESC`.  
You can also search for previous used commands using `CTRL+R` and then start typing the command you're looking for. Here also, click `ESC` to exit this mode.

## Builtin commands
Fugazi comes with a few builtin commands

#### Version
Outputs the version of the client  
Syntax: `version`  
Examples:
```
version
```

#### Set
Stores a value into a variable  
Syntax: 
```
VAR_NAME = VALUE
set VAR_NAME = VALUE
```

Examples:
```
a = 4
set a = true
b = string
set c = "string"
a = { str: "a string", arr: [1, 3] }
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

#### Extract
Returns an inner value inside a compound value  
Syntax: `echo INDEX from VALUE`
Examples:
```
arr = [11, 22, 33]
extract 1 from $arr

map = { str: string, arr: [1, 2, 3], obj: { num: 45, bool: true } }
extract arr from $map
extract "obj.num" from $map
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

## Net (http) module
Provides commands for executing http requests.

#### Http
Make an http request  
Syntax:
```
http URL METHOD
http URL METHOD DATA
http URL METHOD DATA HEADERS
http URL METHOD DATA TIMEOUT
http URL METHOD DATA CONTENT_TYPE
http URL METHOD DATA HEADERS TIMEOUT
http URL METHOD DATA CONTENT_TYPE HEADERS
http URL METHOD DATA CONTENT_TYPE TIMEOUT
http URL METHOD DATA CONTENT_TYPE HEADERS TIMEOUT
```
Examples:
```
```

#### Get
Make an http GET request.  
Same as calling: `http URL get`.  
Syntax:
```
get URL
get URL DATA
get URL DATA HEADERS
get URL DATA TIMEOUT
get URL DATA CONTENT_TYPE
get URL DATA HEADERS TIMEOUT
get URL DATA CONTENT_TYPE HEADERS
get URL DATA CONTENT_TYPE TIMEOUT
get URL DATA CONTENT_TYPE HEADERS TIMEOUT
```
Examples:
```
```

#### Post
Make an http POST request.  
Same as calling: `http URL post`.  
Syntax:
```
post URL
post URL DATA
post URL DATA HEADERS
post URL DATA TIMEOUT
post URL DATA CONTENT_TYPE
post URL DATA HEADERS TIMEOUT
post URL DATA CONTENT_TYPE HEADERS
post URL DATA CONTENT_TYPE TIMEOUT
post URL DATA CONTENT_TYPE HEADERS TIMEOUT
```
Examples:
```
```

#### Delete
Make an http DELETE request.  
Same as calling: `http URL delete`.  
Syntax:
```
delete URL
delete URL DATA
delete URL DATA HEADERS
delete URL DATA TIMEOUT
delete URL DATA CONTENT_TYPE
delete URL DATA HEADERS TIMEOUT
delete URL DATA CONTENT_TYPE HEADERS
delete URL DATA CONTENT_TYPE TIMEOUT
delete URL DATA CONTENT_TYPE HEADERS TIMEOUT
```
Examples:
```
```

## Math example module
You can load a sample module for simple math operations using the `load` command example:
```
load module from "http://fugazi.io/modules/scripts/bin/math.js"
```

#### Add
Outputs the result of the addition of the passed values  
Syntax:
```
VALUE1 + VALUE2
add VALUE1 VALUE2
add [VALUE1, VALUE2, ... VALUEn)
```
Examples:
```
1 + 2
add 5 10
add [1, 2, 30]
```

#### Sub
Outputs the result of the subtraction of the passed values  
Syntax:
```
VALUE1 - VALUE2
sub VALUE1 VALUE2
sub [VALUE1, VALUE2, ... VALUEn)
```
Examples:
```
1 - 2
sub 5 10
sub [1, 2, 30]
```

#### Mul
Outputs the result of the multiplication of the passed values  
Syntax:
```
VALUE1 * VALUE2
mul VALUE1 VALUE2
mul [VALUE1, VALUE2, ... VALUEn)
```
Examples:
```
1 * 2
mul 5 10
mul [1, 2, 30]
```

#### Div
Outputs the result of the devision of the passed values  
Syntax:
```
VALUE1 / VALUE2
div VALUE1 VALUE2
div [VALUE1, VALUE2, ... VALUEn)
```
Examples:
```
1 / 2
div 5 10
div [1, 2, 30]
```

#### Factorial
Outputs the result of the factorial of the passed value  
Syntax:
```
VALUE!
factorial of VALUE
```
Examples:
```
3!
factorial of 5
```

#### Fibonacci
Outputs the result of the fibonacci of the passed value  
Syntax: `fib VALUE`
Examples:
```
fib 5
```
