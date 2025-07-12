import { serveDir, serveFile } from '@std/http/file-server'
import { build } from './build.ts'
import { debounce, delay } from '@std/async'

await build()

void (async () => {
	const cb = debounce(build, 200)
	for await (const event of Deno.watchFs('./src')) {
		if (event.kind === 'modify') cb()
	}
})()

Deno.serve(async (req) => {
	const url = new URL(req.url)
	const pathname = url.pathname

	switch (pathname) {
		case '/': {
			return serveFile(req, './dev/index.html')
		}
		case '/watch': {
			console.info('watching...')

			const watcher = Deno.watchFs('./src')

			for await (const event of watcher) {
				if (event.kind === 'modify') {
					delay(1000).then(() => {
						try {
							watcher.close()
						} catch { /* ignore if already closed */ }
					})
				}
			}

			return new Response(null)
		}
		default: {
			const subPath = pathname.split('/', 2)[1]
			if (['src', 'img'].includes(subPath)) {
				return serveDir(req, { fsRoot: subPath, urlRoot: subPath })
			}
			return new Response('Not Found', { status: 404 })
		}
	}
})
