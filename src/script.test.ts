import { assertEquals } from '@std/assert'

// Normal export/import won't work as the script is not a module (can't currently use ESM in userscripts)
const { config, isCandidate, isInteresting } = globalThis.eval(
	`(() => {
		${await Deno.readTextFile(new URL('./script.mjs', import.meta.url))}
		return _testExports
	})()`,
) as import('./script.mjs').TestExports

Deno.test(isCandidate.name, async (t) => {
	using stack = new DisposableStack()
	const location = globalThis.location
	globalThis.location = new URL('https://www.omniglot.com/writing/burmese.htm') as unknown as Location
	stack.defer(() => globalThis.location = location)
	const getComputedStyle = globalThis.getComputedStyle

	const w = config.minimumSize * 2
	const h = config.minimumSize / 2

	const defaultStyles: Partial<CSSStyleDeclaration> = {
		width: `${w}px`,
		height: `${h}px`,
	}

	// deno-lint-ignore no-explicit-any
	globalThis.getComputedStyle = (el: any) => el._style ?? defaultStyles
	stack.defer(() => globalThis.getComputedStyle = getComputedStyle)

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
			const img = {
				alt,
				closest: () => link == null ? null : { href: link } as HTMLAnchorElement,
				_style: style,
			} as unknown as HTMLImageElement

			assertEquals(isCandidate(img), expect)
		})
	}
})

Deno.test(isInteresting.name, async (t) => {
	const tests: {
		description: string
		alt: string
		expect: boolean
	}[] = [
		{ description: 'Empty alt text', alt: '', expect: false },
		{ description: 'ASCII letters', alt: 'Hello, World！', expect: false },
		{ description: 'Non-ASCII Latin text', alt: 'Khu Vườn Thực', expect: false },
		{ description: 'Cyrillic text', alt: 'Привет, мир!', expect: true },
		{ description: 'Chinese text', alt: '你好，世界！', expect: true },
		{ description: 'Mixed', alt: 'Hello, 世界!', expect: true },
		{ description: 'Punctuation', alt: '.?!,。？！、', expect: false },
		{ description: 'Emoji', alt: '🦕', expect: false },
	]

	for (const { description, alt, expect } of tests) {
		await t.step(`${description}: ${expect}`, () => {
			assertEquals(isInteresting(alt), expect)
		})
	}
})
