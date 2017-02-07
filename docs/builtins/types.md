# Builtin types
Fugazi comes with a few builtin types

### `io.fugazi.core`
The core types are the base of all other types and are based on existing js/json types.  
The core types can be referenced using their full path or their name, for example a `string` can be referenced 
using `string` only or with the full path `io.fugazi.core.string`.

#### Boolean
Matches `true` or `false` without quotes and case is ignored.

#### Number
Matches any number (float, integer, positive, negative) without quotes.

#### String
Matches a quoted string or any single word that isn't a boolean or a number.

#### List
Matches one or more values which can be of any other type.  
A list can be generic: `list<string>`, if the generic constraint isn't set `any` is assumed.

#### Map
Matches one or more key/values.  
The key can only be a string, but the value can be of any other type.  
A map can be generic: `map<string>`, if the generic constraint isn't set `any` is assumed.

#### Void
Can be used as the `returns` type of a command if it does **not** return a value.

#### Any
Matches all values

### `io.fugazi.numbers`
#### Integer
Matches only integer numbers.  
This type is an alias to `number[numbers.integer]`

#### Float
Matches only float numbers.  
This type is an alias to `number[numbers.float]`

### `io.fugazi.net`
#### Url
Matches strings with a url pattern

#### Email
Matches strings with an email pattern
