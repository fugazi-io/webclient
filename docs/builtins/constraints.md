# Builtin constraints
Fugazi comes with a few builtin constraints

### `io.fugazi.core`
#### Enum
Checks that a value is included in a list of predetermined values  
Path: `io.fugazi.core`  
Syntax: 
```
enum ...VALUES
enum ignoreCase ...VALUES
```  
Applies to: [string](./types.md#string)  
Examples:
```
string[enum A B C]
string[enum ignoreCase A B C]
```

#### Struct
Checks that a value has the exact keys and values types based on a predetermined structure.  
**Should not be used explicitly**, this constraint is used internally.  
Path: `io.fugazi.core`  
Applies to: [map](./types.md#map)

#### Generics
Checks that the values in a collection has a specific type.  
**Should not be used explicitly**, this constraint is used internally.  
Path: `io.fugazi.core`  
Applies to: [list](./types.md#list), [map](./types.md#map)

### `io.fugazi.numbers`
#### Integer
Checks that a value is an integer  
Path: `io.fugazi.numbers`  
Syntax: `integer`  
Applies to: [number](./types.md#number)  
Examples:
```
number[numbers.integer]
```

#### Float
Checks that a value is a float  
Path: `io.fugazi.numbers`  
Syntax: `float`  
Applies to: [number](./types.md#number)  
Examples:
```
number[numbers.float]
```

#### Min
Checks that a value is not below a specific threshold  
Path: `io.fugazi.numbers`  
Syntax: `min (num number)`  
Applies to: [number](./types.md#number)  
Examples:
```
number[numbers.min 3]
```

#### Max
Checks that a value is up to a specific limit  
Path: `io.fugazi.numbers`  
Syntax: `max (num number)`  
Applies to: [number](./types.md#number)  
Examples:
```
number[numbers.max 10]
```

#### Between
Checks that a value is between min and max  
Path: `io.fugazi.numbers`  
Syntax: `between (min number) (max number)`  
Applies to: [number](./types.md#number)  
Examples:
```
number[numbers.between 3 10]
```

#### Positive
Checks that a value is equal or greater than 0  
Path: `io.fugazi.numbers`  
Syntax: `positive`  
Applies to: [number](./types.md#number)  
Examples:
```
number[numbers.positive]
```

#### Negative
Checks that a value is less than 0  
Path: `io.fugazi.numbers`  
Syntax: `negative`  
Applies to: [number](./types.md#number)  
Examples:
```
number[numbers.negative]
```

#### Even
Checks that a value divides by 2  
Path: `io.fugazi.numbers`  
Syntax: `even`  
Applies to: [number](./types.md#number)  
Examples:
```
number[numbers.even]
```

#### Odd
Checks that a value isn't divided by 2  
Path: `io.fugazi.numbers`  
Syntax: `odd`  
Applies to: [number](./types.md#number)  
Examples:
```
number[numbers.odd]
```

#### Divided By
Checks that a value is divided by a specific divisor  
Path: `io.fugazi.numbers`  
Syntax: `dividedBy (divisor number)`  
Applies to: [number](./types.md#number)  
Examples:
```
number[numbers.dividedBy 10]
```

### `io.fugazi.strings`
#### Exact Length
Checks that the length of the value is exactly a specific length  
Path: `io.fugazi.strings`  
Syntax: `exactLength (num number)`  
Applies to: [string](./types.md#string)  
Examples:
```
string[strings.exactLength 216]
```

#### Minimum Length
Checks that the length of the value is not below a specific threshold  
Path: `io.fugazi.strings`  
Syntax: `minLength (num number)`  
Applies to: [string](./types.md#string)  
Examples:
```
string[strings.minLength 3]
```

#### Maximum Length
Checks that the length of the value is up to a specific limit  
Path: `io.fugazi.strings`  
Syntax: `maxLength (num number)`  
Applies to: [string](./types.md#string)  
Examples:
```
string[strings.maxLength 10]
```

#### Between
Checks that the length of the value is between min and max  
Path: `io.fugazi.strings`  
Syntax: `between (min number) (max number)`  
Applies to: [string](./types.md#string)  
Examples:
```
string[strings.between 3 10]
```

#### Pattern/RegEx
Checks that the value has a specific pattern  
Path: `io.fugazi.strings`  
Syntax: 
```
regex (pattern string)
regex (pattern string) (flags string)
```  
Applies to: [string](./types.md#string)  
Examples:
```
string[strings.regex '^[a-b]+$']
string[strings.regex '^[a-b]+$' i]
```

### `io.fugazi.collections`
#### Exact Size
Checks that the collection has a specific size  
Path: `io.fugazi.collections`  
Syntax: `exactSize (size number)`  
Applies to: [list](./types.md#list), [map](./types.md#map)  
Examples:
```
list[collections.exactSize 4]
map[collections.exactSize 10]
```

#### Minimum Size
Checks that the collection is at least at a specific size  
Path: `io.fugazi.collections`  
Syntax: `minSize (size number)`  
Applies to: [list](./types.md#list), [map](./types.md#map)  
Examples:
```
list[collections.minSize 4]
map[collections.minSize 10]
```

#### Maximum Size
Checks that the collection is at most at a specific size  
Path: `io.fugazi.collections`  
Syntax: `maxSize (size number)`  
Applies to: [list](./types.md#list), [map](./types.md#map)  
Examples:
```
list[collections.maxSize 4]
map[collections.maxSize 10]
```
