import {ModulesApi} from "./kickstart";

export {HttpMethod} from "../core/net";
export {RequestProperties} from "../core/net";
export {PrivilegedModuleContext} from "./modules";
export {LoadProperties} from "../components/registry";
export {Module} from "../components/modules";
export {Descriptor} from "../components/modules.descriptor";
export {FugaziMap} from "../core/types.collections";
export {ModuleContext} from "../app/modules";
export {BoundConstraintValidator} from "../components/constraints";
export {Component} from "../components/components";

declare global {
	interface Window {
		fugazi: ModulesApi;
	}
	const fugazi: ModulesApi;
}
