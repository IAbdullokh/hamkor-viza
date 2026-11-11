import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { useT } from '@/i18n'
import { DataSourceContext, useDataSource, type DataSourceValue } from '@/data/source'
import { markDashBusy } from '@/features/blockedit/busy'
import { loadDraft, storeDraftPart, useBlockEdit, useEditAction, useSettingHistory } from '@/features/blockedit/context'
import { useToast } from '@/ui/overlay'
import { applyFilters, availableFields, chipsOf, fieldDefs, isActive, MAX_FILTERS, withDraftValue, type FilterItem, type FilterValue } from './fields'
import { FiltersCtx, type LiveFiltersCtx as Ctx } from './ctx'
import { ExtraFiltersSlot, type ExtraFilters } from './slot'
import { joinStored, loadFilters, NO_FILTERS, splitStored, storeFilters, type StoredFilters } from './store'
import { RANGE_KEY, withLayout, type BarLayout } from './bar'
import { addMine, mergeItems, mergeLayout, myKey, orderMine, readMine, removeMine, restoreMine, writeMine, NO_MINE, type MyFilters } from './personal'
import { filterStepLabel, pageState, withPageState, type PageFilterState } from './undo'
import { isNoop, type ApplyPlan } from './picker'
import { fillErrorText, usePortalFields, type PortalField } from './portal'
import { addWaiting, arrived, readWaiting, waitingKey, writeWaiting, type WaitingField } from './waiting'
import { AddedRow, BarRow } from './BarRow'
import { FilterSection } from './FilterSection'
import { readPicked, writePicked } from '@/kit/filterMemory'

const NO_KEYS: string[] = []

/** pages that draw their own filter row (no kit FilterBar): the added filters get a row of their own above */
const OWN_ROW = new Set(['hisobot', 'reja'])

/**
 * Wraps a dashboard page body: loads the page's added filters, keeps what each viewer picked in them (starting from the
 * saved default), and hands the page its data already narrowed — the page computes as before, so every KPI, chart and
 * table follows the filters. In edit mode a signed-in user arranges the dashboard's filters — the defaults for everyone,
 * on the server; outside it every viewer (a public link too) adds, removes and moves filters for themselves, kept only in
 * their browser (personal.ts): what they see is the defaults with their changes on top, and the defaults again when
 * they reset or their browser forgets.
 */
export function FilterScope({ children }: { children: ReactNode }) {
  const be = useBlockEdit()
  if (!be) return <>{children}</>
  return <Scope>{children}</Scope>
}

function Scope({ children }: { children: ReactNode }) {
  const { t } = useT()
  const toast = useToast()
  const be = useBlockEdit()!
  const { scope, page, canEdit, editing, draftVersion } = be
  const src = useDataSource()
  // the dashboard's filters as everyone sees them, and this editor's unpublished ones (a live dashboard's draft, LiveDrafts):
  // edit mode shows and changes the draft; "Saqlash" publishes it with the blocks, "Bekor qilish" drops it
  const [liveAll, setLiveAll] = useState<StoredFilters>(NO_FILTERS)
  const [draftAll, setDraftAll] = useState<StoredFilters | null>(null)
  const drafting = scope.kind === 'live' && editing
  // a draft written before hidden filters existed says nothing of them: the dashboard's own stay
  const all = useMemo(() => (drafting && draftAll ? (draftAll.hidden ? draftAll : { ...draftAll, hidden: liveAll.hidden }) : liveAll), [drafting, draftAll, liveAll])
  const setAll = useCallback((next: StoredFilters) => (drafting ? setDraftAll(next) : setLiveAll(next)), [drafting])
  // what the viewer picked: page|field → a value, or null = cleared (missing = the saved default); kept in this browser
  // per dashboard, so a reload opens on the viewer's last filters (kit/filterMemory.ts, 2026-11-11)
  const [picked, setPicked] = useState<Record<string, FilterValue | null>>(() => readPicked(scope.kind === 'live' ? `live:${scope.slug}` : `demo:${scope.id}`))
  const [picker, setPicker] = useState(false)
  // filters added now that are not stored yet: page|field. One is stored when it gets a value (withDraftValue); the
  // ones left without a value are dropped when edit mode ends
  const [drafts, setDrafts] = useState<string[]>([])
  // this viewer's own filters per page (personal.ts), as stored in this browser; kept here too so a browser that cannot
  // store them still has them while the page is open
  const [mineNow, setMineNow] = useState<Record<string, MyFilters | null>>({})
  const [arranging, setArranging] = useState(false)
  const [, startTransition] = useTransition()
  const scopeKey = scope.kind === 'live' ? `live:${scope.slug}` : `demo:${scope.id}`
  // the latest stored filters for saves that follow each other quickly (a value picked right after adding)
  const latest = useRef(all)
  latest.current = all
  const pickedScope = useRef(scopeKey)
  useEffect(() => {
    // another dashboard in the same frame: its own values, never this one's written over them
    if (pickedScope.current !== scopeKey) {
      pickedScope.current = scopeKey
      setPicked(readPicked(scopeKey))
      return
    }
    writePicked(scopeKey, picked)
  }, [scopeKey, picked])
  const wasEditing = useRef(editing)
  useEffect(() => {
    if (wasEditing.current && !editing) setDrafts([])
    if (editing) setArranging(false)
    wasEditing.current = editing
  }, [editing])

  useEffect(() => {
    const ac = new AbortController()
    loadFilters(scope, ac.signal)
      .then(setLiveAll)
      .catch(() => undefined)
    if (scope.kind === 'live' && canEdit)
      loadDraft(scope, ac.signal)
        .then((d) => setDraftAll(d?.filters ? splitStored(d.filters) : null))
        .catch(() => undefined)
    else setDraftAll(null)
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope; a published / dropped draft reads both again
  }, [scopeKey, canEdit, draftVersion])

  const defs = useMemo(() => fieldDefs(src.meta), [src.meta])
  const fields = useMemo(() => availableFields(defs, src.db), [defs, src.db])
  const byKey = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields])
  const saved = all.pages[page]
  // the dashboard's filters (everyone's defaults) — what edit mode changes
  const defaults = useMemo(() => (saved ?? []).filter((i) => byKey.has(i.field)), [saved, byKey])
  const mineKey = myKey(scopeKey, page)
  const stored = useMemo(() => (mineKey in mineNow ? mineNow[mineKey]! : readMine(mineKey)), [mineKey, mineNow])
  // edit mode shows the defaults as they are, not this user's own layer
  const mine = editing ? null : stored
  const items = useMemo(() => (mine ? mergeItems(defaults, mine, (f) => byKey.has(f)) : defaults), [defaults, mine, byKey])
  const setMine = useCallback(
    (m: MyFilters) => {
      setMineNow((x) => ({ ...x, [mineKey]: m }))
      if (!writeMine(mineKey, m)) toast(t("Brauzer saqlashga ruxsat bermadi — o'zgarish faqat shu ochilishda turadi"), 'error')
    },
    [mineKey, toast, t],
  )
  const resetMine = useCallback(() => {
    setMineNow((x) => ({ ...x, [mineKey]: null }))
    writeMine(mineKey, null)
    setArranging(false)
    toast(t('Filtrlar dashboard standartiga qaytdi'), 'ok')
  }, [mineKey, toast, t])
  const pageDrafts = useMemo(() => drafts.filter((k) => k.startsWith(page + '|')).map((k) => k.slice(page.length + 1)), [drafts, page])
  const chips = useMemo(() => chipsOf(items, pageDrafts, editing, (f) => byKey.get(f)?.kind), [items, pageDrafts, editing, byKey])

  const value = useCallback(
    (field: string): FilterValue | undefined => {
      const key = `${page}|${field}`
      if (key in picked) return picked[key] ?? undefined
      return items.find((i) => i.field === field)?.value
    },
    [page, picked, items],
  )
  // the dashboard's hidden filters ("Yashirin"): only a Studio user gets them (a client view gets its data already narrowed
  // by the server); they narrow every page before the page's own filters, with their saved value
  const hiddenItems = useMemo(() => (all.hidden ?? []).filter((i) => byKey.has(i.field)), [all.hidden, byKey])
  const hiddenDb = useMemo(() => {
    const defs = hiddenItems.map((i) => byKey.get(i.field)!).filter((f, n) => isActive(f.kind, hiddenItems[n]!.value))
    return applyFilters(src.db, defs, Object.fromEntries(hiddenItems.map((i) => [i.field, i.value])))
  }, [hiddenItems, byKey, src.db])
  const values = useMemo(() => Object.fromEntries(chips.map((i) => [i.field, value(i.field)])), [chips, value])
  const activeDefs = useMemo(() => chips.map((i) => byKey.get(i.field)!).filter((f) => isActive(f.kind, values[f.key])), [chips, byKey, values])
  const filtered = useMemo(() => applyFilters(hiddenDb, activeDefs, values), [hiddenDb, activeDefs, values])
  const narrowed = useMemo<DataSourceValue>(() => (filtered === src.db ? src : { ...src, db: filtered }), [src, filtered])

  // edit mode's changes are steps of the dashboard's "← Ortga" / "Oldinga →" (undo.ts); an undo puts the page's
  // filters back through `save` like any change, so it is stored too
  const nameOf = useCallback(
    (k: string) => {
      if (k === RANGE_KEY) return t('Davr')
      const f = byKey.get(k)
      return f ? (f.literal ? f.label : t(f.label)) : undefined
    },
    [byKey, t],
  )
  const putBack = useRef<(s: PageFilterState | undefined) => void>(() => undefined)
  const recordStep = useSettingHistory<PageFilterState>('filters', (s) => putBack.current(s))

  /**
   * shows a change at once and stores it; false (rolled back, said in a toast) when it could not be stored. In edit mode
   * it is one step of the page's history (an undo / redo itself is not: `remember` false)
   */
  const save = useCallback(
    (change: (s: StoredFilters) => StoredFilters, remember = true): Promise<boolean> => {
      const before = latest.current
      const nextAll = change(before)
      latest.current = nextAll
      setAll(nextAll)
      if (remember && editing) {
        const b = pageState(before, page)
        const a = pageState(nextAll, page)
        recordStep(filterStepLabel(b, a, nameOf, t), b, a)
      }
      // a live dashboard's edit mode stores into the editor's draft; the dashboard's own filters stay as they are
      const store = drafting ? storeDraftPart(scope, 'filters', joinStored(nextAll)).then(() => nextAll) : storeFilters(scope, nextAll)
      return store.then(
        (stored) => {
          // a later save already went out: its answer is the one kept
          if (latest.current === nextAll) {
            latest.current = stored
            setAll(stored)
          }
          return true
        },
        () => {
          if (latest.current === nextAll) {
            latest.current = before
            setAll(before)
          }
          toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error')
          return false
        },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
    [scopeKey, toast, t, editing, page, recordStep, nameOf, drafting, setAll],
  )
  putBack.current = (s) => void save((all) => withPageState(all, page, s), false)
  const persist = useCallback(
    (next: FilterItem[]) => {
      void save((s) => {
        const pages = { ...s.pages, [page]: next }
        if (!next.length) delete pages[page]
        return { ...s, pages }
      })
    },
    [page, save],
  )
  const layout = useMemo(() => (editing ? all.layout[page] : mergeLayout(all.layout[page], mine)), [editing, all.layout, page, mine])
  const setLayout = useCallback(
    (l: BarLayout | null) => {
      // outside edit mode a move is this viewer's own order
      if (!editing) {
        setMine(orderMine(stored, l?.order))
        return Promise.resolve(true)
      }
      return save((s) => ({ ...s, layout: withLayout(s.layout, page, l) }))
    },
    [editing, stored, setMine, page, save],
  )

  const setValue = useCallback(
    (field: string, v: FilterValue | null) => {
      markDashBusy()
      startTransition(() => setPicked((p) => ({ ...p, [`${page}|${field}`]: v })))
      // a filter added now is stored with its first value (and follows it while edit mode lasts), not before
      const f = byKey.get(field)
      if (!f || !drafts.includes(`${page}|${field}`)) return
      const was = latest.current.pages[page] ?? []
      const next = withDraftValue(was, field, f.kind, v)
      if (!next) return
      persist(next)
      if (!was.some((i) => i.field === field)) toast(t("Filtr saqlandi — sahifa shu qiymat bilan ochiladi"), 'ok')
    },
    [page, byKey, drafts, persist, toast, t],
  )
  const clear = useCallback(() => {
    markDashBusy()
    startTransition(() => setPicked((p) => ({ ...p, ...Object.fromEntries(chips.map((i) => [`${page}|${i.field}`, null])) })))
  }, [chips, page])

  const add = useCallback(
    (field: string) => {
      if (chips.some((i) => i.field === field)) return
      if (chips.length >= MAX_FILTERS) {
        toast(t("Bir sahifaga ko'pi bilan {n} ta filtr", { n: MAX_FILTERS }), 'error')
        return
      }
      if (!editing) {
        setMine(addMine(stored, [field], defaults.map((i) => i.field)))
        toast(t("Filtr qo'shildi — faqat sizda"), 'ok')
        return
      }
      // stored at once, like the page's own filters: it stays in the filter section with or without a value
      persist([...defaults, { field }])
      toast(t("Filtr qo'shildi"), 'ok')
    },
    [chips, defaults, stored, setMine, persist, editing, toast, t],
  )
  // hidden filters: changed only in edit mode, by a Studio user (the server gives them to no one else); not steps of the
  // page's undo history (they belong to the whole dashboard)
  const hideable = editing && canEdit && all.hidden !== null
  const saveHidden = useCallback(
    (next: FilterItem[], pages?: (p: StoredFilters['pages']) => StoredFilters['pages']) =>
      void save((s) => ({ ...s, pages: pages ? pages(s.pages) : s.pages, hidden: next }), false),
    [save],
  )
  const setHidden = useCallback(
    (field: string, on: boolean) => {
      if (!hideable) return
      const hidden = all.hidden ?? []
      if (on) {
        if (hidden.some((i) => i.field === field)) return
        // the page's filter becomes hidden with the value it has now (or opens with)
        const v = value(field)
        const item: FilterItem = v && byKey.get(field) && isActive(byKey.get(field)!.kind, v) ? { field, value: v } : { field }
        setDrafts((d) => d.filter((k) => k !== `${page}|${field}`))
        saveHidden([...hidden, item], (pages) => {
          const rest = (pages[page] ?? []).filter((i) => i.field !== field)
          const out = { ...pages, [page]: rest }
          if (!rest.length) delete out[page]
          return out
        })
        toast(t("Filtr yashirildi — mijozlar uni ko'rmaydi"), 'ok')
        return
      }
      const it = hidden.find((i) => i.field === field)
      if (!it) return
      saveHidden(
        hidden.filter((i) => i.field !== field),
        (pages) => ((pages[page] ?? []).some((i) => i.field === field) ? pages : { ...pages, [page]: [...(pages[page] ?? []), it] }),
      )
      toast(t("Filtr endi hammaga ko'rinadi"), 'ok')
    },
    [hideable, all.hidden, value, byKey, page, saveHidden, toast, t],
  )
  const setHiddenValue = useCallback(
    (field: string, v: FilterValue | null) => {
      if (!hideable) return
      const f = byKey.get(field)
      markDashBusy()
      saveHidden((all.hidden ?? []).map((i) => (i.field !== field ? i : v && f && isActive(f.kind, v) ? { field, value: v } : { field })))
    },
    [hideable, byKey, all.hidden, saveHidden],
  )
  const removeHidden = useCallback(
    (field: string) => {
      if (hideable) saveHidden((all.hidden ?? []).filter((i) => i.field !== field))
    },
    [hideable, all.hidden, saveHidden],
  )

  // owner, 2026-10-26: "I should be able to add multiple filters at once" — the picker's ticks, stored in one write
  const addMany = useCallback(
    (fields: string[], hidden = false) => {
      if (hidden) {
        if (!hideable) return
        const now = all.hidden ?? []
        const fresh = fields.filter((f, i) => fields.indexOf(f) === i && !now.some((h) => h.field === f))
        if (!fresh.length) return
        const room = Math.max(0, MAX_FILTERS - now.length)
        if (fresh.length > room) toast(t("Bir sahifaga ko'pi bilan {n} ta filtr", { n: MAX_FILTERS }), 'error')
        const take = fresh.slice(0, room)
        if (take.length) saveHidden([...now, ...take.map((field) => ({ field }))])
        if (take.length) toast(t("Yashirin filtr qo'shildi — qiymatini tanlang"), 'ok')
        return
      }
      const fresh = fields.filter((f, i) => fields.indexOf(f) === i && !chips.some((c) => c.field === f))
      if (!fresh.length) return
      const room = Math.max(0, MAX_FILTERS - chips.length)
      if (fresh.length > room) toast(t("Bir sahifaga ko'pi bilan {n} ta filtr", { n: MAX_FILTERS }), 'error')
      const take = fresh.slice(0, room)
      if (!take.length) return
      if (!editing) {
        setMine(addMine(stored, take, defaults.map((i) => i.field)))
        toast(take.length === 1 ? t("Filtr qo'shildi — faqat sizda") : t("{n} ta filtr qo'shildi — faqat sizda", { n: take.length }), 'ok')
        return
      }
      persist([...defaults, ...take.map((field) => ({ field }))])
      toast(take.length === 1 ? t("Filtr qo'shildi") : t("{n} ta filtr qo'shildi", { n: take.length }), 'ok')
    },
    [chips, defaults, stored, setMine, persist, editing, toast, t, hideable, all.hidden, saveHidden],
  )
  const remove = useCallback(
    (field: string) => {
      setDrafts((d) => d.filter((k) => k !== `${page}|${field}`))
      // outside edit mode: off this viewer's bar only (an added filter or one of the page's own)
      if (!editing) setMine(removeMine(stored, field))
      else if (defaults.some((i) => i.field === field)) persist(defaults.filter((i) => i.field !== field))
      setPicked((p) => {
        const n = { ...p }
        delete n[`${page}|${field}`]
        return n
      })
    },
    [editing, stored, setMine, defaults, persist, page],
  )
  const restore = useCallback((field: string) => setMine(restoreMine(stored, field)), [stored, setMine])

  // ── «Filtr maydonlari» (FieldPicker): the whole set in one write, and the fields whose data is still being read ──
  const slug = scope.kind === 'live' ? scope.slug : null
  const waitKey = waitingKey(scopeKey, page)
  const [waitNow, setWaitNow] = useState<Record<string, WaitingField[]>>({})
  const waiting = useMemo(() => (waitKey in waitNow ? waitNow[waitKey]! : readWaiting(waitKey)), [waitKey, waitNow])
  const setWaiting = useCallback(
    (next: WaitingField[]) => {
      setWaitNow((x) => ({ ...x, [waitKey]: next }))
      writeWaiting(waitKey, next)
    },
    [waitKey],
  )
  const portal = usePortalFields(slug, !!slug && canEdit, picker || waiting.length > 0)
  const dropWaiting = useCallback((key: string) => setWaiting(waiting.filter((w) => w.key !== key)), [waiting, setWaiting])

  /** adds (to the page, and to the hidden filters) and takes off filters in one stored write */
  const applySet = useCallback(
    (addShown: string[], addHidden: string[], removeShown: string[], removeHiddenKeys: string[]) => {
      const uniq = (xs: string[]) => xs.filter((f, i) => xs.indexOf(f) === i && byKey.has(f))
      const fresh = uniq(addShown)
      const freshHidden = hideable ? uniq(addHidden) : []
      if (!fresh.length && !freshHidden.length && !removeShown.length && !removeHiddenKeys.length) return
      markDashBusy()
      if (removeShown.length) {
        setDrafts((d) => d.filter((k) => !removeShown.some((f) => k === `${page}|${f}`)))
        setPicked((p) => {
          const n = { ...p }
          for (const f of removeShown) delete n[`${page}|${f}`]
          return n
        })
      }
      if (!editing) {
        // a viewer's own filters (hidden ones are never theirs to change)
        let m: MyFilters = stored ?? NO_MINE
        for (const f of removeShown) m = removeMine(m, f)
        const shownFresh = fresh.filter((f) => !chips.some((c) => c.field === f && !removeShown.includes(f)))
        if (shownFresh.length) m = addMine(m, shownFresh, defaults.map((i) => i.field))
        const after = mergeItems(defaults, m, (f) => byKey.has(f)).map((i) => i.field)
        const same = after.length === defaults.length && after.every((f, n) => defaults[n]!.field === f)
        if (same && !m.order?.length) {
          setMineNow((x) => ({ ...x, [mineKey]: null }))
          writeMine(mineKey, null)
        } else setMine(m)
        return
      }
      const keep = defaults.filter((i) => !removeShown.includes(i.field))
      const shownAdd = fresh.filter((f) => !keep.some((i) => i.field === f))
      const nextShown = [...keep, ...shownAdd.map((field) => ({ field }))]
      const nowHidden = all.hidden ?? []
      const keepHidden = hideable ? nowHidden.filter((i) => !removeHiddenKeys.includes(i.field)) : nowHidden
      const hiddenAdd = freshHidden.filter((f) => !keepHidden.some((i) => i.field === f) && !nextShown.some((i) => i.field === f))
      void save((s) => {
        const pages = { ...s.pages, [page]: nextShown }
        if (!nextShown.length) delete pages[page]
        return { ...s, pages, hidden: hideable ? [...keepHidden, ...hiddenAdd.map((field) => ({ field }))] : s.hidden }
      })
    },
    [byKey, page, editing, stored, chips, defaults, mineKey, setMine, all.hidden, hideable, save],
  )

  // a waiting field the reloaded data now has: it becomes the filter it was ticked as
  useEffect(() => {
    if (!waiting.length) return
    const { shown, hidden, rest } = arrived(waiting, byKey, hideable)
    if (!shown.length && !hidden.length) return
    setWaiting(rest)
    applySet(shown, hidden, [], [])
    toast(t("Ma'lumot olindi — {n} ta filtr qo'shildi", { n: shown.length + hidden.length }), 'ok')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the data (byKey) or the list changes
  }, [byKey, waiting, hideable])

  const fillNow = useCallback(
    async (calls: ApplyPlan['fills'], fields: PortalField[]) => {
      if (!calls.length) return
      const out = await portal.fill(calls, fields)
      for (const r of out.refused) toast(t(fillErrorText(r.code)), 'error')
      const queued = out.started.filter((j) => j.waiting).length
      if (queued) toast(t('Yangilanish tugagach olinadi'), 'info')
    },
    [portal, toast, t],
  )
  const applyPicker = useCallback(
    async (plan: ApplyPlan) => {
      if (plan.over > 0) toast(t("Bir sahifaga ko'pi bilan {n} ta filtr", { n: MAX_FILTERS }), 'error')
      if (isNoop(plan)) return
      applySet(plan.hidden ? [] : plan.add, plan.hidden ? plan.add : [], plan.remove, plan.removeHidden)
      if (plan.pending.length || plan.unwait.length) setWaiting(addWaiting(waiting.filter((w) => !plan.unwait.includes(w.key)), plan.pending, plan.hidden))
      const changed = plan.add.length + plan.remove.length + plan.removeHidden.length
      if (changed) toast(t('Filtrlar yangilandi'), 'ok')
      await fillNow(plan.fills, plan.pending)
    },
    [applySet, waiting, setWaiting, fillNow, toast, t],
  )
  const retryFill = useCallback((field: PortalField) => void fillNow([{ entity: field.entity, codes: [field.code] }], [field]), [fillNow])
  // «Standart»: the dashboard's own set (edit mode: as published, without the draft)
  const defaultSet = useMemo(() => {
    const src = editing ? liveAll : all
    const shown = editing ? (src.pages[page] ?? []).map((i) => i.field) : defaults.map((i) => i.field)
    return [...shown, ...(src.hidden ?? []).map((i) => i.field)].filter((f, i, a) => byKey.has(f) && a.indexOf(f) === i)
  }, [editing, liveAll, all, page, defaults, byKey])
  const move = useCallback(
    (from: number, to: number) => {
      // only the stored filters trade places (the new ones without a value stay last); edit mode only — outside it the
      // bar's order (setLayout) is the viewer's own
      if (!editing || from === to || from < 0 || to < 0 || from >= defaults.length || to >= defaults.length) return
      const next = [...defaults]
      const [x] = next.splice(from, 1)
      next.splice(to, 0, x!)
      persist(next)
    },
    [editing, defaults, persist],
  )
  const saveDefault = useCallback(
    (field: string, v: FilterValue | null) => {
      const f = byKey.get(field)
      const keep: FilterItem = v && f && isActive(f.kind, v) ? { field, value: v } : { field }
      const known = defaults.some((i) => i.field === field)
      // a filter added now is not stored without a value
      if (!known && !keep.value) return
      persist(known ? defaults.map((i) => (i.field !== field ? i : keep)) : [...defaults, keep])
      toast(keep.value ? t('Standart qiymat saqlandi') : t('Standart qiymat olib tashlandi'), 'ok')
    },
    [defaults, persist, byKey, toast, t],
  )

  // the edit bar's "Filtr qo'shildi" adds to everyone's defaults: it opens the picker in edit mode
  // (a steady function: the edit bar re-registers on every new one)
  const beNow = useRef(be)
  beNow.current = be
  const openPicker = useCallback(() => {
    if (!beNow.current.editing) beNow.current.setEditing(true)
    setPicker(true)
  }, [])
  useEditAction('addFilter', canEdit ? openPicker : undefined)

  const isDraft = useCallback((field: string) => pageDrafts.includes(field) && !defaults.some((i) => i.field === field), [pageDrafts, defaults])

  const ctx = useMemo<Ctx>(
    () => ({
      page,
      slug,
      fields,
      byKey,
      items: chips,
      isDraft,
      value,
      setValue,
      canEdit,
      editing,
      add,
      addMany,
      remove,
      move,
      saveDefault,
      activeCount: activeDefs.length,
      clear,
      raw: hiddenDb,
      hidden: hiddenItems,
      hideable,
      setHidden,
      setHiddenValue,
      removeHidden,
      picker,
      setPicker,
      layout,
      setLayout,
      arranging: arranging && !editing,
      setArranging,
      mine: !!mine,
      removedByMe: mine?.removed ?? NO_KEYS,
      restore,
      resetMine,
      defaultSet,
      applyPicker,
      portal: slug && canEdit ? portal : null,
      waiting,
      dropWaiting,
      retryFill,
    }),
    [page, slug, fields, byKey, chips, isDraft, value, setValue, canEdit, editing, add, addMany, remove, move, saveDefault, activeDefs.length, clear, hiddenDb, hiddenItems, hideable, setHidden, setHiddenValue, removeHidden, picker, layout, setLayout, arranging, mine, restore, resetMine, defaultSet, applyPicker, portal, waiting, dropWaiting, retryFill],
  )
  const created = value('created')
  const createdFrom = created?.from
  const createdTo = created?.to
  const setCreated = useCallback((v: { from: string; to: string } | null) => setValue('created', v), [setValue])
  const slot = useMemo<ExtraFilters>(
    () => ({ Chips: AddedRow, active: activeDefs.length > 0, clear, Row: BarRow, Section: FilterSection, created: createdFrom || createdTo ? { from: createdFrom, to: createdTo } : undefined, setCreated }),
    [activeDefs.length, clear, createdFrom, createdTo, setCreated],
  )

  // every viewer has "+ Filtr" there now (their own filters)
  const ownRow = OWN_ROW.has(page)
  return (
    <FiltersCtx.Provider value={ctx}>
      <ExtraFiltersSlot.Provider value={slot}>
        {ownRow && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <AddedRow />
            {activeDefs.length > 0 && (
              <button type="button" onClick={clear} className="pressable rounded-full px-2.5 py-1 text-[0.8125rem] font-medium text-primary-strong hover:bg-primary-soft">
                {t('Tozalash')}
              </button>
            )}
          </div>
        )}
        <DataSourceContext.Provider value={narrowed}>{children}</DataSourceContext.Provider>
      </ExtraFiltersSlot.Provider>
    </FiltersCtx.Provider>
  )
}
