import { useContext } from 'react'
import { getWorkspace, WORKSPACE_ID } from './workspaces'
import { generate, type GeneratedDb } from './generate'
import { DataSourceContext } from './source'
import type { ChatSalesTables } from './types'

/**
 * The demo's "synced storage": one generated database per workspace, built on first use and cached.
 * Pages read it with `useDb()`. Inside a live project (`DataSourceProvider`) `useDb()` returns the project's hydrated
 * snapshot instead; all client data is scoped to that project.
 */
export type Db = GeneratedDb & { wsId: string } & Partial<ChatSalesTables>

/** chats + POS tables of a Db; [] where the source has none (the demo, a project without those sources) */
export function chatSales(db: Db): ChatSalesTables {
  return { conversations: db.conversations ?? [], orders: db.orders ?? [], orderLines: db.orderLines ?? [], products: db.products ?? [] }
}

const cache = new Map<string, Db>()

export function getDb(wsId: string): Db {
  let db = cache.get(wsId)
  if (!db) {
    const t0 = performance.now()
    db = { ...generate(getWorkspace(wsId)), wsId }
    cache.set(wsId, db)
    if (import.meta.env.DEV) console.debug(`[nazar] generated ${wsId} in ${Math.round(performance.now() - t0)}ms`, { leads: db.leads.length, calls: db.calls.length })
  }
  return db
}

/** Database of the current data source: the project snapshot inside a live dashboard, the demo otherwise. */
export function useDb(): Db {
  return useContext(DataSourceContext)?.db ?? getDb(WORKSPACE_ID)
}
