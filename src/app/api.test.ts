import { describe, expect, it } from 'vitest'
import { config } from '@/config'
import { apiPath, demoLiveInfo, localAnswer } from './api'

const slug = config.project.slug

describe('data source selection', () => {
  it('serves block edits, charts, filters and prefs from config in both modes', () => {
    for (const mode of ['live', 'demo'] as const) {
      expect(localAnswer('GET', `/live/${slug}/blocks`, mode)).toEqual({ status: 200, body: config.blocks })
      expect(localAnswer('GET', `/live/${slug}/prefs`, mode)).toEqual({ status: 200, body: config.prefs })
    }
  })

  it('live mode sends the data itself to the server', () => {
    expect(localAnswer('GET', `/live/${slug}`, 'live')).toBeNull()
    expect(localAnswer('GET', `/live/${slug}/dataset`, 'live')).toBeNull()
    expect(localAnswer('GET', `/live/${slug}/state`, 'live')).toBeNull()
    expect(localAnswer('POST', '/publish/viewer/login', 'live')).toBeNull()
  })

  it('demo mode never reaches a server', () => {
    expect(localAnswer('GET', `/live/${slug}`, 'demo')).toEqual({ status: 200, body: demoLiveInfo() })
    expect(localAnswer('GET', `/live/${slug}/state`, 'demo')?.status).toBe(200)
    expect(localAnswer('GET', `/live/${slug}/dataset`, 'demo')?.status).toBe(404)
    expect(localAnswer('POST', '/publish/viewer/login', 'demo')?.status).toBe(404)
  })

  it('refuses the editor saves (this copy is edited in code)', () => {
    expect(localAnswer('PUT', `/live/${slug}/blocks`, 'live')?.status).toBe(403)
  })

  it('demo live info lists the configured pages', () => {
    expect(demoLiveInfo().pages).toEqual(config.project.pages)
    expect(demoLiveInfo().refreshable).toBe(false)
  })

  it('recognises API calls by prefix', () => {
    expect(apiPath('/api/live/x/blocks', '/api', 'http://localhost:5173/')).toBe('/live/x/blocks')
    expect(apiPath('http://localhost:5173/api', '/api', 'http://localhost:5173/')).toBe('/')
    expect(apiPath('/apis/x', '/api', 'http://localhost:5173/')).toBeNull()
    expect(apiPath('https://fonts.googleapis.com/css2', '/api', 'http://localhost:5173/')).toBeNull()
    expect(apiPath('https://srv.example/api/live/x', 'https://srv.example/api', 'http://localhost:5173/')).toBe('/live/x')
  })
})
