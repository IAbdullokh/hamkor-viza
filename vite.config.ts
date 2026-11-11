import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

const SRC = fileURLToPath(new URL('./src', import.meta.url))
const DATA = fileURLToPath(new URL('./data', import.meta.url))
/** the published server of this dashboard (override with VITE_API_BASE in .env.local) */
const DEFAULT_SERVER = 'https://hamkor-viza.data365dashboard.uz'
const SLUG = 'hamkor-viza'

/**
 * `npm run dev:snapshot`: the dashboard's live info, dataset and page values from data/ (saved by `npm run snapshot`,
 * gitignored) — real numbers offline, no server. Anything else under /api answers 404.
 */
function snapshotApi(): Plugin {
  const files: Record<string, string> = { [`/api/live/${SLUG}`]: 'live.json', [`/api/live/${SLUG}/dataset`]: 'dataset.json', [`/api/live/${SLUG}/state`]: 'state.json' }
  return {
    name: 'd365-snapshot-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0] ?? ''
        if (!path.startsWith('/api/')) return next()
        const file = files[path]
        const full = file ? `${DATA}/${file}` : null
        res.setHeader('Content-Type', 'application/json')
        if (path === '/api/publish/resolve') return res.end(JSON.stringify({ slug: SLUG, name: '', protected: false, viewer: true }))
        if (!full || !existsSync(full)) {
          res.statusCode = 404
          return res.end(JSON.stringify({ code: 'NOT_FOUND', detail: full ? `run npm run snapshot first (${file} missing)` : 'not in the snapshot' }))
        }
        res.end(readFileSync(full))
      })
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const server = (env.VITE_API_BASE || DEFAULT_SERVER).replace(/\/+$/, '')
  // what the browser calls: same-origin /api (the dev proxy below, or the app served from the dashboard's own domain);
  // VITE_API_DIRECT=1 builds an app that calls the server cross-origin (that server must allow it: CORS + credentials)
  const api = command === 'build' && env.VITE_API_DIRECT === '1' ? `${server}/api` : '/api'
  // dev: /api → the published server, as if the page were on its domain (its cookie session works on localhost)
  const proxy: Record<string, ProxyOptions> | undefined =
    mode === 'demo' || mode === 'snapshot'
      ? undefined
      : {
          '/api': {
            target: server,
            changeOrigin: true,
            secure: true,
            // the session cookie is the server domain's: keep it on localhost
            cookieDomainRewrite: { '*': '' },
            configure: (p) => {
              p.on('proxyReq', (req) => {
                req.setHeader('origin', server)
              })
              // the cookie is Secure: on http://localhost the browser keeps it only without the flag
              p.on('proxyRes', (res) => {
                const set = res.headers['set-cookie']
                if (set) res.headers['set-cookie'] = set.map((c) => c.replace(/;\s*Secure/gi, ''))
              })
            },
          },
        }
  return {
    // relative base: dist/ can be served from any path
    base: './',
    plugins: [react(), tailwindcss(), ...(mode === 'snapshot' ? [snapshotApi()] : [])],
    // Tailwind v4 runs as a Vite plugin; an inline empty PostCSS config stops Vite from picking up a parent folder's config
    css: { postcss: {} },
    define: {
      'import.meta.env.VITE_API_BASE': JSON.stringify(api),
      'import.meta.env.VITE_DATA_MODE': JSON.stringify(mode === 'demo' ? 'demo' : 'live'),
    },
    resolve: { alias: { '@': SRC }, dedupe: ['react', 'react-dom'] },
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  }
})
