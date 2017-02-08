# Math example module
You can load a sample module for simple math operations using the `load` command example:
```
load module from "http://fugazi.io/modules/scripts/bin/math.js"
```
[The source for the module](https://github.com/fugazi-io/webclient/blob/master/modules/scripts/src/math.ts)

### Commands
#### Add
Outputs the result of the addition of the passed values  
Path: `samples.math`  
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
Path: `samples.math`  
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
Path: `samples.math`  
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
Path: `samples.math`  
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
Path: `samples.math`  
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
Path: `samples.math`  
Syntax: `fib VALUE`
Examples:
```
fib 5
```