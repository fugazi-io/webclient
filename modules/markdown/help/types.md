### Types

#### Core types
All fugazi types are based on the following core types (similar to json):

 * Boolean
 * Number
 * String
 * List
 * Map

And two additional "special" type:

 * Void
 * Any
 
(more info in the [core types docs](https://github.com/fugazi-io/webclient/blob/master/docs/builtins/types.md#iofugazicore))
 
##### Examples
```fugazi-command
// command
echo { key1: "value 1", key2: 3 }
```

Will print the value as a `map`.

For information about how to use types in descriptors go to the [types docs](https://github.com/fugazi-io/webclient/blob/master/docs/components/types.md)