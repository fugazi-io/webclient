(function () {
	let X = null,
		Y = null,
		handler = z => {
			if (X === null) {
				return {
					type: "string",
					status: fugazi.handler.ResultStatus.Prompt,
					message: "please enter a value for x",
					handler: x => {
						X = x;
						handler(z);
					}
				}
			}

			if (Y === null) {
				return {
					type: "string",
					status: fugazi.handler.ResultStatus.Prompt,
					message: "please enter a value for y",
					handler: y => {
						Y = y;
						handler(z);
					}
				}
			}

			return X * Y * z;
		}

	fugazi.loaded({
		name: "aLocalTest",
		title: "A (local) Test!",
		commands: {
			doit: {
				returns: "number",
				syntax: "do it (x number)",
				handler: function(context, z) {
					return handler(z);
				}
			}
		}
	});
})();
