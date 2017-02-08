# fugazi.io 

A web based terminal application for executing local and remote commands.  
The latest version of the terminal can be found here: http://fugazi.io

### Installation
The client requires no servers, other than hosting the static files (scripts, styles, etc).  
Here's how to run it locally:

1. Clone the repo  
2. Install the dependencies: `/FUGAZI_PATH/node install`  
3. Compile the typescript files: `/FUGAZI_PATH/node_modules/typescript/bin/tsc -p /FUGAZI_PATH/scripts`  
4. Serve `/FUGAZI_PATH` from a local webserver or IDE  
5. Open the `/FUGAZI_PATH/index.html` in the browser (based on how you serve it)  

### Features
1. Executing of local (js) commands and remote (HTTP) commands
2. Remote commands can be issues directly if the server supports CORS, or a proxy frame can be hosted in the server to support non-CORS
3. Remote authentication (currently only basic auth is supported)
4. Commands syntax is determined by the command author
5. Type validation
6. Composing of new types
7. Commands suggestions (press `TAB` to see suggestions and then `TAB` again or `ESC` to close)
8. Move in the command history (by pressing the up & down arrows)
9. Search for command in history (press `CTRL + R` then start typing and `ENTER` to select, `ESC` to close)

### More documentation

#### Components
1. Components basics
2. Modules
3. Types
4. Constraints
5. Converters
6. Commands

#### Descriptors
1. [Descriptors basics](docs/descriptors/component.md)
2. [Module Descriptors](docs/descriptors/module.md)
3. [Type Descriptors](docs/descriptors/type.md)
4. [Constraint Descriptors](docs/descriptors/constraint.md)
5. [Converter Descriptors](docs/descriptors/converter.md)
6. [Command Descriptors](docs/descriptors/command.md)

#### Builtin Components
1. [Types](./docs/builtins/types.md)
2. [Commands](./docs/builtins/commands.md)
3. [Constraints](./docs/builtins/constraints.md)

#### Examples
1. [Simple Math Module](./docs/examples/math.md)

#### Getting help
Use the [issues](//github.com/fugazi-io/webclient/issues) for any bug, request, question

### Contribution
We're looking for more help, if you're interested find us in this `gmail.com` address: `terminal.fugazi.io`
