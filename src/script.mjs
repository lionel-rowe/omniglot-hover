// @ts-check
/// <reference lib="DOM" />
/// <reference lib="DOM.iterable" />

const config = /** @type {const} */ ({
	/** CSS selector of the top parent element within which to render overlays */
	parent: '#body',
	/** Minimum size of an image to add an overlay (as equivalent area of a square with side length N pixels) */
	minimumSize: 150,
	/** Regular expression to match "interesting" word-like characters in alt text for purpose of adding copy button */
	interesting: /[^\d\p{scx=Latn}]/u,
})

/**
 * Used to track which images have been processed, to avoid processing the same image multiple times.
 * @type {WeakSet<HTMLImageElement>}
 */
const seen = new WeakSet()

// only run if `document` is available to prevent errors in testing environment
// eslint-disable-next-line no-undef
if (typeof globalThis.document === 'object') start()

function start() {
	const observer = new MutationObserver(queueAllOverlays)
	observer.observe(document.documentElement, { subtree: true, childList: true })
	queueAllOverlays([], observer)
}

/** @type {MutationCallback} */
function queueAllOverlays(_, observer) {
	if (document.readyState !== 'loading') observer.disconnect()

	const imgs = /** @type {Iterable<HTMLImageElement>} */ (document.querySelectorAll(`${config.parent} img[alt]`))
	for (const img of imgs) {
		if (seen.has(img)) continue
		seen.add(img)
		queueOverlay(img)
	}
}

/**
 * Queue an image for overlay processing when it loads, or immediately if it has already loaded.
 * @param img {HTMLImageElement}
 */
function queueOverlay(img) {
	if (img.complete) addOverlay.call(img)
	else img.addEventListener('load', addOverlay, { once: true })
}

/**
 * Add an overlay to an image
 * @this {HTMLImageElement} img - must be an image that has finished loading, to ensure computed styles etc. are correct
 */
function addOverlay() {
	if (!isCandidate(this)) return

	const { alt } = this

	const wrapper = document.createElement('span')
	const className = 'omniglot-hover'
	wrapper.className = className
	this.replaceWith(wrapper)

	const overlay = document.createElement('div')
	overlay.className = `${className}__overlay`

	const text = document.createElement('div')
	text.className = `${className}__text`
	text.textContent = alt

	if (isInteresting(alt)) {
		const copyButton = document.createElement('button')
		copyButton.className = `${className}__copy-button`
		copyButton.textContent = 'Copy'
		copyButton.addEventListener('click', async () => {
			await navigator.clipboard.writeText(alt)
			copyButton.textContent = 'Copied!'
			await new Promise((res) => setTimeout(res, 2000))
			copyButton.textContent = 'Copy'
		})
		text.append(copyButton)
	}

	overlay.append(text)
	wrapper.append(this, overlay)

	// re-apply `float` style to avoid messing with layout
	const { float } = getComputedStyle(this)
	console.log(float)
	if (float !== 'none') wrapper.style.float = float
}

/**
 * Check if the image is a candidate for adding an overlay.
 * @param {HTMLImageElement} img
 */
function isCandidate(img) {
	if (!img.alt) return false

	// skip images inside external links (ads/affiliates, social icons, donate buttons, etc.)
	const link = /** @type {HTMLAnchorElement} */ (img.closest('a[href]'))
	if (link && new URL(link.href).hostname !== location.hostname) {
		return false
	}

	// skip images with float styles to avoid messing with layout
	const { width, height } = getComputedStyle(img)

	// skip images that are too small to usefully render an overlay
	if (parseFloat(width) * parseFloat(height) < config.minimumSize ** 2) return false

	return true
}

/**
 * Check if the alt text is "interesting" and should therefore have a copy button.
 *
 * Matches any non-Latin word-like character, on the assumption that any image with matching alt text is likely to be
 * "interesting" for the purpose of copiable text, e.g. a language sample.
 * @param {string} altText
 */
function isInteresting(altText) {
	// assume private use characters are "word-like", since they are often used for con-scripts  (see e.g. sample text
	// on https://www.omniglot.com/conscripts/klingon.htm)
	const wordLike = /[\p{L}\p{M}\p{N}\p{Private_Use}]+/gu
	const interesting = new RegExp(config.interesting, config.interesting.flags.replace('g', ''))
	let match
	while ((match = wordLike.exec(altText))) {
		if (interesting.test(match[0])) return true
	}
	return false
}

/** @typedef {typeof _testExports} TestExports */
/** Must be defined for testing purposes */
// eslint-disable-next-line no-unused-vars
const _testExports = { config, isCandidate, isInteresting }
