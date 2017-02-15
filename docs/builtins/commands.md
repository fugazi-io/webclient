# Builtin commands
Fugazi comes with a few builtin commands

### `io.fugazi` commands
Basic commands

#### Version
Outputs the version of the client  
Path: `io.fugazi`  
Syntax: `version`  
Examples:
```
version
```

#### Echo
Outputs the passed value  
Path: `io.fugazi`  
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

### `io.fugazi.terminal` commands
Commands regarding a specific terminal instance.

#### Set
Stores a value into a variable  
Path: `io.fugazi.terminal`  
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

### `io.fugazi.components` commands
Components commands

#### List
Outputs the list of different component types in different modules  
Path: `io.fugazi.components`  
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
Path: `io.fugazi.components`  
Urls must end with either `.json` or `.js`.  
Syntax: `load module from URL`  
Examples:
```
load module from "http://fugazi.io/modules/scripts/bin/math.js"
```

### `io.fugazi.net` commands
Network (HTTP) commands

#### Http
Make an http request  
Path: `io.fugazi.net`  
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
http "https://httpbin.org/get" GET
```

#### Get
Make an http GET request.  
Same as calling: `http URL get`.  
Path: `io.fugazi.net`  
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
get "https://httpbin.org/get?key=value"
get "https://httpbin.org/get" { key: value }
get "https://httpbin.org/get" { key: value } { "X-MY-HEADER": "a header" }
```

#### Post
Make an http POST request.  
Same as calling: `http URL post`.  
Path: `io.fugazi.net`  
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
Path: `io.fugazi.net`  
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