import { serveDir, serveFile } from '@std/http/file-server'
import { build } from './build.ts'
import { delay } from '@std/async'

await build()

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
					delay(1000).then(async () => {
						try {
							watcher.close()
							await build()
						} catch { /* ignore if already closed */ }
					})
				}
			}

			return new Response(null)
		}
		default: {
			if (pathname.startsWith('/img/')) {
				return serveDir(req, { fsRoot: 'img', urlRoot: 'img' })
			}
			return serveDir(req, { fsRoot: 'src' })
		}
	}
})
