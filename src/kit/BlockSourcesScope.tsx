import { useMemo, type ReactNode } from 'react'
import { useDb } from '@/data/db'
import { useMeta } from '@/data/source'
import type { Call } from '@/data/types'
import { tableSources } from '@/features/livefilters/sources'
import { fieldDefs, type TableName } from '@/features/livefilters/fields'
import { BlockSourcesCtx, PAGE_TABLES } from './SourceMark'

/** a call table's systems as the rows name them, read once per table (the same array → the same answer) */
const providersOf = new WeakMap<readonly Call[], string[]>()
export function callProviders(calls: readonly Call[]): string[] {
  let out = providersOf.get(calls)
  if (!out) {
    const seen = new Set<string>()
    for (let i = 0; i < calls.length; i++) {
      const p = calls[i]!.provider
      if (p) seen.add(p)
    }
    out = [...seen]
    providersOf.set(calls, out)
  }
  return out
}

/** a dashboard page's blocks cite their systems (mount inside the DataSourceProvider) */
export function BlockSourcesScope({ page, children }: { page: string; children: ReactNode }) {
  const meta = useMeta()
  const db = useDb()
  const providers = callProviders(db.calls)
  const key = providers.join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the providers by their joined key: a filtered copy of the same calls changes nothing
  const ts = useMemo(() => tableSources(meta, providers), [meta, key])
  const fieldTables = useMemo(() => new Map(fieldDefs(meta, ts).map((f) => [f.key, Object.keys(f.get) as TableName[]])), [meta, ts])
  const value = useMemo(() => ({ ts, tables: PAGE_TABLES[page] ?? [], meta, fieldTables }), [ts, page, meta, fieldTables])
  return <BlockSourcesCtx.Provider value={value}>{children}</BlockSourcesCtx.Provider>
}

