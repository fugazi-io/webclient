import * as React from "react";

export interface ViewProperties {
	ref?: (<T>(el: T) => void) | string;
	key?: string;
}

export interface ViewState {}

export class View<P extends ViewProperties, S extends ViewState> extends React.Component<P, S> {
	constructor(props?: P) {
		super(props);
		this.state = <S> {};
	}
}
