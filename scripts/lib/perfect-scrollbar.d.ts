declare module Ps {
	interface Parameters {
		suppressScrollX?: boolean;
		useSelectionScroll?: boolean;
	}

	function initialize(container: any, params?: Parameters): void;
	function update(container: any): void;
	function destroy(container: any): void;
}