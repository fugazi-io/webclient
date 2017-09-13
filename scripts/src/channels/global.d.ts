export interface RemoteProxyData {
	id: string;
	scriptsBase: string;
	parentOrigin: string;
}

declare global {
	interface Window {
		proxyData: RemoteProxyData;
	}
}