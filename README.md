# fugazi.io 

A web based terminal application for executing local and remote commands.  
The latest version of the terminal can be found here: http://fugazi.io

### Development
The client requires no servers, other than hosting the static files (scripts, styles, etc).  
Here's how to run it locally:

1. Clone the repo and change into the directory
1. Install the dependencies: `$ npm install`
1. Run `$ npm run dev` (read the `dev` npm script in `package.json` for more information)
1. Open the provided URL in the browser.

### Features
1. Executing of local (js) commands and remote (HTTP) commands
2. Remote commands can be issues directly if the server supports CORS, or a proxy frame can be hosted in the server to support non-CORS
3. Remote authentication (currently only basic auth is supported)
4. Commands syntax is determined by the command author
5. Type validation
6. Composing of new types
7. Commands suggestions
    1. Press `TAB` to open the suggestions box
    2. Press `ESC` to close the suggestion box
    3. While open, `TAB` can be used to switch to _selection mode_ and back to _input mode_
    4. While in _selection mode_, press `ENTER` to select a suggestion
8. Move in the command history (by pressing the up & down arrows)
9. Search for command in history (press `CTRL + R` then start typing and `ENTER` to select, `ESC` to close)

### More documentation

#### Components
1. [Components basics](docs/components/components.md)
2. [Modules](docs/components/modules.md)
3. [Types](docs/components/types.md)
4. [Constraints](docs/components/constraints.md)
5. [Converters](docs/components/converters.md)
6. [Commands](docs/components/commands.md)

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
