(function () {
	let x = null,
		y = null,
		handler = z => {
			if (x === null) {
				return {
					type: "string",
					status: fugazi.handler.ResultStatus.Prompt,
					message: "please enter a value for x",
					handler
				}
			}

			if (y === null) {
				return {
					type: "string",
					status: fugazi.handler.ResultStatus.Prompt,
					message: "please enter a value for y",
					handler
				}
			}

			console.log(x * y * z);
		}

	fugazi.loaded({
		name: "aTest",
		title: "A Test!",
		commands: {
			test: {
				syntax: "do it (x number)",
				handler: function(context, z) {
					return handler(z);
				}
			}
		}
	});
})();