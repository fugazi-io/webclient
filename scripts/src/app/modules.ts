/**
 * Created by nitzan on 07/01/2017.
 */

/// <reference path="./terminal.ts" />

module fugazi.app.modules {
	export interface ModuleData {
		set(name: string, value: any): void;
		has(name: string): boolean;
		get(name: string): any;
	}

	export class BaseModuleContext<Parent extends terminal.BaseTerminalContext> extends BaseContext<Parent> {
		private _data: Map<string, any>;
		private _dataProxy: ModuleData;

		constructor(parent: Parent) {
			super(parent);

			this._data = new Map();
			this._dataProxy = {
				set: (name, value) => {
					this._data.set(name, value);
				},
				has: name => this._data.has(name),
				get: name => this._data.get(name)
			}
		}

		public get data(): ModuleData {
			return this._dataProxy;
		}
	}

	export type DefaultModuleContext = BaseModuleContext<terminal.BaseTerminalContext>;

	export class ModuleContext extends BaseModuleContext<terminal.RestrictedTerminalContext> {}

	export class PrivilegedModuleContext extends BaseModuleContext<terminal.TerminalContext> {}

	/*export function createContext(parent: terminal.TerminalContext): PrivilegedModuleContext;
	export function createContext(parent: terminal.RestrictedTerminalContext): RestrictedModuleContext;
	export function createContext<Parent extends terminal.BaseTerminalContext>(parent: Parent) {
		return new ModuleContext(parent);
	}*/
}