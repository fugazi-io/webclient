# fugazi.io 

A web based terminal application for executing local and remote commands.  
The latest version of the terminal can be found here: http://fugazi.io

### Installation
The client requires no servers, other than hosting the static files (scripts, styles, etc).  
To run locally install the [npm package](https://www.npmjs.com/package/@fugazi/webclient):
```bash
npm install @fugazi/webclient
```

Then build the scripts:
```bash
npm run transpile
```

After the compilation ended, serve the files:
```bash
npm run serve
```

That's it, you have fugazi locally served, open [http://localhost:3330/index.hml](http://localhost:3330/index.hml) in your browser.

### Development
If you want to develop with/for fugazi then you better clone this repo.  
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
* [Components basics](docs/components/components.md)
* [Modules](docs/components/modules.md)
* [Types](docs/components/types.md)
* [Constraints](docs/components/constraints.md)
* [Converters](docs/components/converters.md)
* [Commands](docs/components/commands.md)

#### Descriptors
* [Descriptors basics](docs/descriptors/component.md)
* [Module Descriptors](docs/descriptors/module.md)
* [Type Descriptors](docs/descriptors/type.md)
* [Constraint Descriptors](docs/descriptors/constraint.md)
* [Converter Descriptors](docs/descriptors/converter.md)
* [Command Descriptors](docs/descriptors/command.md)

#### Builtin Components
* [Types](./docs/builtins/types.md)
* [Commands](./docs/builtins/commands.md)
* [Constraints](./docs/builtins/constraints.md)

### Connectors
* [Connectors](./docs/connectors/connectors.md)
* [Expose an existing http based api](./docs/connectors/existing-service.md)

#### Examples
* [Simple Math Module](./docs/examples/math.md)

#### Getting help
Use the [issues](//github.com/fugazi-io/webclient/issues) for any bug, request, question

### Contribution
We're looking for more help, if you're interested find us in this `gmail.com` address: `terminal.fugazi.io`
