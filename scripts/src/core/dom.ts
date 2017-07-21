import * as collections from './types/collections';
import * as types from './types/index';

let domReady = false;
document.addEventListener("DOMContentLoaded", () => {
	domReady = true;
});

export const CREATE_INNER_HTML_KEY: string = "html";

export enum InsertPosition {
	Before = 0,
	After = 1,
	Prepend = 2,
	Append = 3
}

export function get(query: string, context?: Element): Element {
	if (context) {
		return context.querySelector(query);
	}
	return document.querySelector(query);
}

export function getAll(query: string, context?: Element): HTMLElement[] {
	if (context) {
		return collections.cloneArray(<NodeListOf<HTMLElement>> context.querySelectorAll(query));
	}

	return collections.cloneArray(<NodeListOf<HTMLElement>> document.querySelectorAll(query));
}

export function ready(callback: types.Callback): void {
	if (domReady) {
		callback();
	} else {
		document.addEventListener("DOMContentLoaded", callback);
	}
}

export function hasClass(element: HTMLElement, className: string): boolean {
	if (!element) {
		return false;
	}
	className = className.trim();
	let regexp: RegExp = new RegExp("\\b" + className + "\\b");
	return element.className.match(regexp) != null;
}

export function addClass(elements: string, className: string): void;
export function addClass(elements: HTMLElement, className: string): void;
export function addClass(elements: HTMLElement[], className: string): void;
export function addClass(elements: string, className: string[]): void;
export function addClass(elements: HTMLElement, className: string[]): void;
export function addClass(elements: HTMLElement[], className: string[]): void;
export function addClass(elements: any, className: any): void {
	if (!elements) {
		return;
	}
	elements = toElementsArr(elements);
	if (types.is(className, Array)) {
		className = className.join(" ");
	}

	var addClassToEl: Function = function (element: HTMLElement, className: string): void {
		if (!hasClass(element, className)) {
			element.className += " " + className;
		}
	};

	applyOnAll(addClassToEl, elements, className);

}

export function removeClass(elements: string, className: string): void;
export function removeClass(elements: HTMLElement, className: string): void;
export function removeClass(elements: HTMLElement[], className: string): void
export function removeClass(elements: any, className: any): void {
	if (!elements) {
		return;
	}
	elements = toElementsArr(elements);
	className = className.trim();

	var removeClassFromEl: Function = function (element: HTMLElement, className: string): void {
		if (hasClass(element, className)) {
			var regexp: RegExp = new RegExp("\\b" + className + "\\b");
			element.className = element.className.replace(regexp, "").trim();
		}
	};
	applyOnAll(removeClassFromEl, elements, className);

}

export function create(tagName: string, properites?: Object, referenceElement?: any, position: InsertPosition = InsertPosition.Append): Element {
	var element: HTMLElement = document.createElement(tagName);
	var iterator: collections.PlainObjectIterator<any>;
	var property: collections.KeyValueEntry<any>;

	if (properites) {
		iterator = new collections.PlainObjectIterator<any>(<types.PlainObject<any>> properites);
		while (iterator.hasNext()) {
			property = iterator.next();
			if (property.key === CREATE_INNER_HTML_KEY) {
				element.innerHTML = property.value;
			} else {
				element.setAttribute(property.key, property.value);
			}
		}
	}

	if (referenceElement) {
		var ref: HTMLElement = getAsElement(referenceElement);
		insert(element, ref, position);
	}

	return element;
}

export function remove(element: HTMLElement): void {
	if (!element || !element.parentNode) {
		return;
	}

	element.parentNode.removeChild(element);
}

export function insert(newElement: HTMLElement, referenceElement?: any, position: InsertPosition = InsertPosition.Append): HTMLElement {
	var ref: HTMLElement = getAsElement(referenceElement);
	switch (position) {
		case InsertPosition.Before:
			return insertBefore(newElement, ref);

		case InsertPosition.After:
			return insertAfter(newElement, ref);

		case InsertPosition.Prepend:
			return prepend(newElement, ref);

		case InsertPosition.Append:
			return append(newElement, ref);
	}

	return null;
}

export function insertBefore(newElement: any, referenceElement: any): HTMLElement {
	var ref: HTMLElement = getAsElement(referenceElement);
	var parentElement: HTMLElement;
	if (!ref) {

		return null;
	}
	if (typeof newElement === "string") {
		ref.insertAdjacentHTML("beforebegin", <string>newElement);
		return <HTMLElement>ref.previousSibling;

	}

	parentElement = parent(ref);

	return <HTMLElement> parentElement.insertBefore(newElement, referenceElement);
}

export function insertAfter(newElement: any, referenceElement: any): HTMLElement {
	var nextNode: HTMLElement = nextSibling(referenceElement);

	if (nextNode) {
		return insertBefore(newElement, nextSibling(referenceElement));
	} else {
		return append(newElement, parent(referenceElement));
	}
}

export function prepend(newElement: any, parentElement: HTMLElement): HTMLElement {
	var firstChildNode: HTMLElement = firstChild(parentElement);

	if (firstChildNode) {
		return insertBefore(newElement, firstChildNode);
	} else {
		return append(newElement, parentElement);
	}
}

export function append(newElement: any, parentElement: HTMLElement): HTMLElement {
	if (typeof newElement === "string") {
		parentElement.insertAdjacentHTML("beforeend", <string>newElement);
		return <HTMLElement>parentElement.lastChild;
	}

	return <HTMLElement> parentElement.appendChild(newElement);
}

export function children(element: HTMLElement, selector?: string): HTMLElement[] {
	var i: number;
	if (!selector) {
		return <HTMLElement[]> collections.cloneArray(element.children);
	}

	var matched: HTMLElement[] = getAll(selector, element),
		result: HTMLElement[] = [];

	for (i = 0; i < matched.length; i++) {
		if (parent(matched[i]) === element) {
			result.push(matched[i]);
		}
	}

	return result;
}

export function firstChild(element: HTMLElement, selector?: string): HTMLElement {
	var i: number;
	var matched: HTMLElement[];
	if (!selector) {
		return <HTMLElement> element.firstElementChild;
	}

	matched = getAll(selector, element);

	for (i = 0; i < matched.length; i++) {
		if (parent(matched[i]) === element) {
			return matched[i];
		}
	}

	return null;
}

export function lastChild(element: HTMLElement, selector?: string): HTMLElement {
	if (!selector) {
		return <HTMLElement> element.lastElementChild;
	}

	return children(element, selector).last();
}

function nextSibling(element: HTMLElement, selector?: string): HTMLElement {
	if (!selector) {
		return <HTMLElement> element.nextElementSibling;
	}

	var matched: HTMLElement[] = getAll(selector, parent(element));
	while (element.nextElementSibling != null) {
		element = <HTMLElement> element.nextElementSibling;
		if (matched.includes(element)) {
			return element;
		}
	}

	return null;
}

export function parent(element: HTMLElement, selector?: string): HTMLElement {
	if (!selector) {
		return element.parentElement;
	}

	var matched: HTMLElement[] = getAll(selector),
		current: HTMLElement = element.parentElement;

	while (current != null && !matched.includes(current)) {
		current = current.parentElement;
	}

	return current;
}

export function style(element: HTMLElement, values: any): void {
	var key: string;
	var styleObj: CSSStyleDeclaration = element.style;
	for (key in values) {
		if (values.hasOwnProperty(key)) {
			styleObj[key] = values[key];
		}
	}
}

function getAsElement(obj: any, defaultElement?: HTMLElement): HTMLElement {
	obj = obj || defaultElement;
	if (types.is(obj, String)) {
		obj = get(obj);
	}
	return obj;
}

function toElementsArr(obj: any): HTMLElement[] {
	if (types.is(obj, String)) {
		return getAll(obj);
	}
	if (types.is(obj, HTMLElement)) {
		return [obj];
	}
	return obj;
}

function applyOnAll(func: Function, arr: any[], ...args: any[]): void {
	arr.forEach(function (obj: any): void {
		var arrCopy: any[] = Array.prototype.slice.call(args || [], 0);
		Array.prototype.unshift.call(arrCopy, obj);
		func.apply({}, arrCopy);
	});
}
