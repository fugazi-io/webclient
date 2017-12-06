export const version = {
	code: "1.1.21",
	name: "The Argument",
	toString: function () {
		return `${ this.name } (${ this.code })`;
	}
};

export const Events = {
	Loaded: "app.loaded",
	Ready: "app.ready"
};
