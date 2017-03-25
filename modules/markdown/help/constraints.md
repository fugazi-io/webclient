### Type constraints
Fugazi has only a few core types (run `help types` or go to the [core types docs](https://github.com/fugazi-io/webclient/blob/master/docs/builtins/types.md#iofugazicore)), 
all other types are based on an existing type with additional constraints.

When a value is checked against a type these constraints are checked and only if all validated then the value is accepted.  
Constraints are javascript functions which return true if the passed in value satisfies a specific constraints.

[Built-in constraints docs](https://github.com/fugazi-io/webclient/blob/master/docs/builtins/constraints.md)