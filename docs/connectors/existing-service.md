# Expose an existing http based api

The fugazi client executes remote commands by issuing http requests which makes it easy to use any service which exposes 
 an http api.  
 
The client comes with an existing set of [commands for making http requests](https://github.com/fugazi-io/webclient/blob/master/docs/builtins/commands.md#iofugazinet-commands) 
which can be used to interact with an existing service, for example:
```fugazi
get "http://myservice.com/api/user/userid"
```

While this approach works, it can be tedious and not very intuitive.  
By serving a `descriptor.json` file you can describe the service to the client.  The descriptor doesn't need to be served 
from the service itself, the client can load it from anywhere, as long as the [remote info is configured](https://github.com/fugazi-io/webclient/blob/master/docs/descriptors/module.md#remotesourcedescriptor).
 
The different descriptors have their [own documentation](https://github.com/fugazi-io/webclient#descriptors), but an example 
for such a descriptor:
```json
{
	"name": "myservice",
	"title": "My Service",
	"remote": {
		"origin": "http://myservice.com",
		"base": "/api"
	},
	"types": {
		"user": {
			"title": "A user",
			"type": {
				"id": "string",
				"username": "string",
				"name": {
					"first": "string",
					"last": "string"
				}
			}
		}
	},
	"commands": {
		"userById": {
			"title": "Get a user by id",
			"returns": "user",
			"syntax": "get user with id (userId string)",
			"handler": {
				"endpoint": "/user/id/{userId}"
			}
		},
		"userByUserName": {
 			"title": "Get a user by username",
 			"returns": "user",
			"syntax": "get user with username (username string)",
			"handler": {
				"endpoint": "/user/username/{userId}"
			}
		},
		"saveUser": {
			"title": "Save a user",
			"returns": "void",
			"syntax": "save user (user user)",
			"handler": {
				"endpoint": "/user",
				"method": "post"
			}
		}
	}
}
```
