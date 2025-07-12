import { assertEquals } from '@std/assert'
// @ts-types='@types/jsdom'
import { JSDOM } from 'jsdom'
import { stubProperty } from '@std/testing/unstable-stub-property'

// Normal export/import won't work as the script is not a module (can't currently use ESM in userscripts)
const { isCandidate, isInteresting } = globalThis.eval(
	`(() => {
		${await Deno.readTextFile(new URL('../src/script.mjs', import.meta.url))}
		return _testExports
	})()`,
) as import('../src/script.mjs').TestExports

Deno.test(isCandidate.name, async (t) => {
	const jsdom = new JSDOM(await Deno.readTextFile('./test/fixtures/page.html'), {
		url: 'https://www.omniglot.com/writing/burmese.htm',
	})

	using stack = new DisposableStack()
	stack.use(stubProperty(globalThis, 'document', jsdom.window.document))
	stack.use(stubProperty(globalThis, 'location', jsdom.window.location))
	stack.use(stubProperty(globalThis, 'getComputedStyle', jsdom.window.getComputedStyle))

	for (const img of document.querySelectorAll('img')) {
		const { description, expect } = img.dataset

		await t.step(`${description}: ${expect}`, () => {
			assertEquals(isCandidate(img), JSON.parse(expect!))
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
