### Variables
Variables are easy to use!

#### Setting
To set a variable use the [set command](https://github.com/fugazi-io/webclient/blob/master/docs/builtins/commands.md#set):
```fugazi-command
// command
set a = 4
```
```fugazi-command
// command
set a = [1, 2, string]
```

Or the shorter syntax:
```fugazi-command
// command
a = true
```
```fugazi-command
// command
a = { key1: value, key2: "long value" }
```

#### Storing a command result
You can set a variable to store the result of a command execution:
```fugazi-command
// command
a = (extract 2 from [1, 2, 3])
```
```fugazi-commands
// command
load module from "http://fugazi.io/modules/scripts/bin/math.js"
// command
a = (1 + 4)
```

#### Getting
You can use a variable as an input to commands:
```fugazi-commands
// command
a = (extract 2 from [1, 2, 3])
// command
echo $a
// output
3
```
```fugazi-commands
// command
load module from "http://fugazi.io/modules/scripts/bin/math.js"
// command
a = (1 + 4)
// command
echo ($a * 10)
// output
50
```