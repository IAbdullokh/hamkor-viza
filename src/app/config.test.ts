import { describe, expect, it } from 'vitest'
import { config, configAnswer } from '@/config'
import { PAGES } from '@/web/registry'

describe('config', () => {
  it('names a published dashboard with known pages', () => {
    expect(config.project.slug).toMatch(/^[a-z0-9-]+$/)
    expect(config.project.publishedHost).toMatch(/^[a-z0-9.-]+$/)
    expect(config.project.pages.length).toBeGreaterThan(0)
    const known = new Set(PAGES.map((p) => p.id))
    for (const p of config.project.pages) expect(known.has(p)).toBe(true)
  })

  it('answers the four settings Studio used to serve', () => {
    expect(configAnswer('blocks')).toBe(config.blocks)
    expect(configAnswer('charts')).toBe(config.charts)
    expect(configAnswer('filters')).toBe(config.filters)
    expect(configAnswer('prefs')).toBe(config.prefs)
    expect(configAnswer('dataset')).toBeUndefined()
  })

  it('block edits are a map of block id → edit', () => {
    expect(typeof config.blocks).toBe('object')
    expect(Array.isArray(config.blocks)).toBe(false)
    for (const id of Object.keys(config.blocks)) expect(id.split(':').length).toBeGreaterThanOrEqual(3)
  })
})
