// @ts-types='@types/jsdom'
import { type ConstructorOptions, JSDOM } from 'jsdom'
import { stubProperty } from '@std/testing/unstable-stub-property'

export class StubbedJsDom extends JSDOM implements Disposable {
	[Symbol.dispose]: () => void

	constructor(html: string, options?: ConstructorOptions) {
		super(html, options)
		const stack = new DisposableStack()
		this[Symbol.dispose] = () => stack[Symbol.dispose]()
		for (const property of ['document', 'location', 'getComputedStyle'] as const) {
			stack.use(stubProperty(globalThis, property, this.window[property]))
		}
	}
}
