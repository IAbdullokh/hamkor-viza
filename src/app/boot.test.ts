import { describe, expect, it } from 'vitest'
import { config } from '@/config'
import { resolveBoot } from './boot'
import { dataModeOf } from './mode'

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  (async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })) as unknown as typeof fetch

describe('boot', () => {
  it('picks the data mode from the Vite mode', () => {
    expect(dataModeOf('demo', undefined)).toBe('demo')
    expect(dataModeOf('development', 'demo')).toBe('demo')
    expect(dataModeOf('development', undefined)).toBe('live')
    expect(dataModeOf('production', 'live')).toBe('live')
  })

  it('demo mode starts at once, without asking a server', async () => {
    const never = (() => {
      throw new Error('no fetch in demo')
    }) as unknown as typeof fetch
    expect(await resolveBoot('demo', never)).toEqual({ kind: 'app' })
  })

  it('shows the login card when the server says "login needed"', async () => {
    expect(await resolveBoot('live', json(200, { slug: config.project.slug, name: 'X', protected: true, viewer: false }))).toEqual({ kind: 'login', name: 'X' })
    expect(await resolveBoot('live', json(401, { code: 'VIEWER_LOGIN' }))).toEqual({ kind: 'login', name: config.project.name })
  })

  it('starts the app for a signed-in viewer or an open dashboard', async () => {
    expect(await resolveBoot('live', json(200, { slug: config.project.slug, name: 'X', protected: true, viewer: true }))).toEqual({ kind: 'app' })
    expect(await resolveBoot('live', json(200, { slug: config.project.slug, name: 'X', protected: false, viewer: false }))).toEqual({ kind: 'app' })
  })

  it('says "not found" for an address the publishing server does not know', async () => {
    expect(await resolveBoot('live', json(404, {}, { 'X-D365-Hub': '1' }))).toEqual({ kind: 'unknown' })
  })

  it('a server that does not answer still starts the app (it shows its own error)', async () => {
    const down = (async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    expect(await resolveBoot('live', down)).toEqual({ kind: 'app' })
  })
})
