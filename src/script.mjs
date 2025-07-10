// @ts-check
/// <reference lib="DOM" />
/// <reference lib="DOM.iterable" />

/** @type {WeakSet<HTMLImageElement>} */
const seen = new WeakSet()

function addAllOverlays() {
	const imgs = /** @type {NodeListOf<HTMLImageElement>} */ (document.querySelectorAll('img[alt]'))
	for (const img of imgs) {
		if (seen.has(img)) continue
		addOverlay(img)
	}
}

/**
 * Match any non-Latin word-like character, on the assumption that any image with matching alt text is likely to be
 * "interesting" for the purposes of copiable text, e.g. a language sample.
 * @param {string} alt
 */
function isInteresting(alt) {
	return /[\p{L}\p{M}\p{N}]/u.test(alt.replaceAll(/[\w\p{scx=Latn}]/gu, ''))
}

/** @param img {HTMLImageElement} */
function addOverlay(img) {
	seen.add(img)

	const { alt } = img

	const parent = document.createElement('span')
	parent.className = 'omniglot-hover'
	img.replaceWith(parent)

	const overlay = document.createElement('div')
	overlay.className = 'omniglot-hover-overlay'

	const text = document.createElement('div')
	text.className = 'omniglot-hover-text'
	text.textContent = alt

	if (isInteresting(alt)) {
		const copyButton = document.createElement('button')
		copyButton.className = 'omniglot-hover-copy-button'
		copyButton.textContent = 'Copy'
		copyButton.addEventListener('click', () => {
			navigator.clipboard.writeText(alt)
			copyButton.textContent = 'Copied!'
			setTimeout(() => {
				copyButton.textContent = 'Copy'
			}, 2000)
		})
		text.append(copyButton)
	}

	overlay.append(text)
	parent.append(img, overlay)
}

const getObservableElements = () => [
	document.documentElement,
	document.body,
]

/** @type {MutationObserver} */
let observer
observe()

function observe() {
	const observableElements = getObservableElements()
	const foundIndex = observableElements.findLastIndex((target) => target != null)
	const target = observableElements[foundIndex]

	// keep observing until the last target is rendered to the DOM
	let callback = observe
	if (foundIndex === observableElements.length - 1) {
		// run immediately in case matching images are already present
		addAllOverlays()
		// then observe for new images
		callback = addAllOverlays
	}

	observer?.disconnect()
	observer = new MutationObserver(callback)
	observer.observe(target, { subtree: true, childList: true })
}
