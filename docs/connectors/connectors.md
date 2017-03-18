# Connectors

Connectors are sever side applications which expose services to the fugazi client.  
The service can be run on a remote server or the local machine.  

A connector
* Serves a `descriptor.json` file which describes the service
* Handles requests to command endpoints as described in the descriptor

## Do I need a connector?
If your service which you want to use from the fugazi client already exposes an http based api then you do not 
need to use a connector, instead it's enough to serve a descriptor which describes your existing exposed api.  
More info in [Expose an existing http based api](./existing-service.md).

## Implementation
Currently there's support for node.js based connectors only.

### Node.js
You can build a connector using the [@fugazi/connector package](https://www.npmjs.com/package/@fugazi/connector)

## Available connectors
 * [Redis connector](https://github.com/fugazi-io/connector.node.redis): A node.js based connector for Redis