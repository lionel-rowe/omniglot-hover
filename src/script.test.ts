import { assertEquals } from '@std/assert'
// @ts-types='@types/jsdom'
import jsdom from 'jsdom'
const { JSDOM } = jsdom

// Normal export/import won't work as the script is not a module (can't currently use ESM in userscripts)
const { config, isCandidate, isInteresting } = globalThis.eval(
	`(() => {
		${await Deno.readTextFile(new URL('./script.mjs', import.meta.url))}
		return _testExports
	})()`,
) as import('./script.mjs').TestExports

Deno.test(isCandidate.name, async (t) => {
	const { window } = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
		url: 'https://www.omniglot.com/writing/burmese.htm',
	})
	const { document } = window

	using stack = new DisposableStack()
	const location = globalThis.location
	globalThis.location = window.location
	stack.defer(() => globalThis.location = location)
	const getComputedStyle = window.getComputedStyle
	globalThis.getComputedStyle = window.getComputedStyle
	stack.defer(() => globalThis.getComputedStyle = getComputedStyle)

	const w = config.minimumSize * 2
	const h = config.minimumSize / 2

	const defaultStyles: Partial<CSSStyleDeclaration> = {
		width: `${w}px`,
		height: `${h}px`,
	}

	const tests: {
		description: string
		alt: string
		link?: string
		expect: boolean
		style?: Partial<CSSStyleDeclaration>
	}[] = [
		{ description: 'No alt text', alt: '', expect: false },
		{ description: 'Has alt text', alt: 'Some text', expect: true },

		{
			description: 'Internal link with alt text',
			alt: 'Some text',
			link: 'https://www.omniglot.com/internal.htm',
			expect: true,
		},
		{
			description: 'External link with alt text',
			alt: 'Some text',
			link: 'https://example.com/external.htm',
			expect: false,
		},

		{
			description: 'width too small',
			alt: 'Some text',
			style: { width: `${w - 0.1}px`, height: `${h}px` },
			expect: false,
		},
		{
			description: 'height too small',
			alt: 'Some text',
			style: { width: `${w}px`, height: `${h - 0.1}px` },
			expect: false,
		},
		{
			description: 'minimum dimensions',
			alt: 'Some text',
			style: { width: `${w}px`, height: `${h}px` },
			expect: true,
		},
		{
			description: 'minimum dimensions swapped',
			alt: 'Some text',
			style: { width: `${h}px`, height: `${w}px` },
			expect: true,
		},
	]

	for (const { description, alt, link, expect, style } of tests) {
		await t.step(`${description}: ${expect}`, () => {
			const img = document.createElement('img')
			img.alt = alt

			for (const [key, value] of Object.entries(style ?? defaultStyles)) {
				// @ts-ignore corresponding key/value type
				img.style[key] = value
			}

			let el: HTMLElement = img
			if (link) {
				const a = document.createElement('a')
				a.href = link
				a.appendChild(img)
				el = a
			}

			document.body.appendChild(el)
			assertEquals(isCandidate(img), expect)
		})
	}
})

Deno.test(isInteresting.name, async (t) => {
	const tests: {
		description: string
		text: string
		expect: boolean
	}[] = [
		{ description: 'Empty alt text', text: '', expect: false },
		{ description: 'ASCII letters', text: 'Hello, World！', expect: false },
		{ description: 'Non-ASCII Latin text', text: 'Khu Vườn Thực', expect: false },
		{ description: 'Cyrillic text', text: 'Привет, мир!', expect: true },
		{ description: 'Chinese text', text: '你好，世界！', expect: true },
		{ description: 'Mixed', text: 'Hello, 世界!', expect: true },
		{ description: 'Punctuation', text: '.?!,。？！、', expect: false },
		{ description: 'Emoji', text: '🦕', expect: false },
		{ description: 'Private use', text: '', expect: true },
	]

	for (const { description, text, expect } of tests) {
		await t.step(`${description}: ${expect}`, () => {
			assertEquals(isInteresting(text), expect)
		})
	}
})
