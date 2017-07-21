import * as location from "./location";

const SCRIPTS_BASE_URL: string = location.relative("scripts/bin");

export function scriptUrl(path: string): string {
	return SCRIPTS_BASE_URL + "/" + path;
}