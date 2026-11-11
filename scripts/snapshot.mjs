#!/usr/bin/env node
/**
 * npm run snapshot — saves the dashboard's current data from the published server into data/ (gitignored: it is client
 * data, never commit it), so `npm run dev:snapshot` works offline on real numbers.
 * Needs the dashboard's viewer login: VIEWER_LOGIN and VIEWER_PASSWORD in .env.local (or the environment).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const env = { ...readEnv('.env'), ...readEnv('.env.local'), ...process.env }
const project = readFileSync(`${ROOT}src/config/project.gen.ts`, 'utf8')
const slug = /"slug":\s*"([^"]+)"/.exec(project)?.[1]
const host = /"publishedHost":\s*"([^"]+)"/.exec(project)?.[1]
const server = (env.VITE_API_BASE || `https://${host}`).replace(/\/+$/, '')

function readEnv(name) {
  const f = `${ROOT}${name}`
  if (!existsSync(f)) return {}
  const out = {}
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m && m[2] !== '') out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

async function main() {
  if (!slug) throw new Error('src/config/project.gen.ts has no slug')
  if (!env.VIEWER_LOGIN || !env.VIEWER_PASSWORD) throw new Error('set VIEWER_LOGIN and VIEWER_PASSWORD in .env.local (the dashboard viewer login)')
  const headers = { Accept: 'application/json', 'X-Requested-With': 'd365', Origin: server }
  const login = await fetch(`${server}/api/publish/viewer/login`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, login: env.VIEWER_LOGIN, password: env.VIEWER_PASSWORD }),
  })
  if (!login.ok) throw new Error(`login failed: HTTP ${login.status} ${await login.text()}`)
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
  mkdirSync(`${ROOT}data`, { recursive: true })
  for (const [path, file] of [
    ['', 'live.json'],
    ['/dataset', 'dataset.json'],
    ['/state?versions=true', 'state.json'],
  ]) {
    const res = await fetch(`${server}/api/live/${encodeURIComponent(slug)}${path}`, { headers: { ...headers, Cookie: cookie } })
    if (!res.ok) throw new Error(`${path || '/'}: HTTP ${res.status}`)
    writeFileSync(`${ROOT}data/${file}`, await res.text())
    console.log(`saved data/${file}`)
  }
  console.log('done — npm run dev:snapshot shows it. data/ is gitignored: never commit it.')
}

main().catch((e) => {
  console.error('snapshot failed: ' + (e instanceof Error ? e.message : String(e)))
  process.exit(1)
})
