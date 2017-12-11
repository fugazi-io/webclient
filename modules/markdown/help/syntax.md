### Syntax
Each command (whether it's local or remote) defines (at least one) syntax rule.  
A syntax rule is made up of `keywords` and `parameters` of specific types.

For example a syntax rule for a command which adds numbers:
```fugazi-syntax-rules
(a number) + (b number)
add (a number) (b number)
add (numbers list<number>)
```
