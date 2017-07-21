import * as collections from "../core/types.collections";

const subscribers: collections.Map<EventHandler[]> = collections.map<EventHandler[]>();

export interface EventHandler {
	(): void;
}

export function register(eventName: string, eventHandler: EventHandler): void {
	var handlers: EventHandler[];

	if (subscribers.has(eventName)) {
		handlers = subscribers.get(eventName);
	} else {
		handlers = [];
		subscribers.set(eventName, handlers);
	}

	handlers.push(eventHandler);
}

export function unregister(eventName: string, eventHandler: EventHandler): void {
	if (subscribers.has(eventName)) {
		subscribers.get(eventName).remove(eventHandler);
	}
}

export function post(eventName: string) {
	if (subscribers.has(eventName)) {
		subscribers.get(eventName).forEach(handler => handler());
	}
}

