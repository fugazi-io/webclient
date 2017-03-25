### Syntax
Each command (whether it's local or remote) defines (at least one) syntax rule.  
A syntax rule is made up of `keywords` and `parameters` of specific types.

For example a syntax rule for a command which adds numbers (from the [simple math module](https://github.com/fugazi-io/webclient/blob/master/docs/examples/math.md)):
```fugazi-syntax-rules
(a number) + (b number)
add (a number) (b number)
add (numbers list<number>)
```

More on syntax in the [commands docs page](https://github.com/fugazi-io/webclient/blob/master/docs/components/commands.md#syntax)