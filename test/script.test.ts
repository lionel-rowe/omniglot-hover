import { assertEquals } from '@std/assert'
import { StubbedJsDom } from './testUtils.ts'

// Normal export/import won't work as the script is not a module (can't currently use ESM in userscripts)
const { config, addOverlay, isCandidate, isInteresting } = globalThis.eval(
	`(() => {
		${await Deno.readTextFile(new URL('../src/script.mjs', import.meta.url))}
		return _testExports
	})()`,
) as import('../src/script.mjs').TestExports

Deno.test(addOverlay.name, async () => {
	using _jsdom = new StubbedJsDom(await Deno.readTextFile('./test/fixtures/rendering.html'), {
		url: 'https://www.omniglot.com/writing/burmese.htm',
	})

	const expected: (string | null)[] = [
		`<span class="omniglot-hover">
			<img
				alt="文字"
				style="width: 500px; height: 200px"
				src="https://www.omniglot.com/image.jpg"
			>
			<div class="omniglot-hover__overlay">
				<div class="omniglot-hover__text">
					文字
					<button class="omniglot-hover__copy-button">Copy</button>
				</div>
			</div>
		</span>`,

		`<span
			class="omniglot-hover"
			style="float: left; --marginTop: 10px; --marginBottom: 10px; --marginLeft: 20px; --marginRight: 20px;"
		>
			<img
				alt="Hello world"
				style="width: 500px; height: 200px; margin: 10px 20px; float: left"
				src="https://www.omniglot.com/image.jpg"
			>
			<div class="omniglot-hover__overlay">
				<div class="omniglot-hover__text">
					Hello world
				</div>
			</div>
		</span>`,

		null,
	]

	const imgs = document.querySelectorAll('img')

	assertEquals(imgs.length, expected.length)

	for (const [i, img] of imgs.entries()) {
		const selector = `.${config.className}`
		const expectedHtml = expected[i]
			?.replaceAll(/\s*([<>])\s*/g, '$1')
			.replaceAll(/\s+/g, ' ')
			.trim() ?? null

		// run twice to test idempotency - second call should not change the result
		for (let i = 0; i < 2; ++i) {
			assertEquals(isCandidate(img), i === 0 && expectedHtml != null)
			addOverlay.call(img)

			assertEquals(img.closest(selector)?.parentElement?.closest(selector) ?? null, null)
			assertEquals(img.closest(selector)?.outerHTML ?? null, expectedHtml)
		}
	}
})

Deno.test(isCandidate.name, async (t) => {
	using _jsdom = new StubbedJsDom(await Deno.readTextFile('./test/fixtures/candidates.html'), {
		url: 'https://www.omniglot.com/writing/burmese.htm',
	})

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
