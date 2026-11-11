import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ChevronDown, PaintBucket } from 'lucide-react'
import { useT } from '@/i18n'
import { useDesign, VARIANT_TRAITS } from '@/lib/design'
import { useLookMix } from '@/lib/lookMix'
import { bgsFor, effectiveBg, isPageBg, setPageBg, type LookTone, type PageBg } from '@/lib/pageBg'
import { setViewScope, useViewLook } from '@/lib/viewLook'
import { loadDraft, storeDraftPart, useBlockEdit, useSettingHistory } from '@/features/blockedit/context'
import { Button } from '@/ui/controls'
import { DropMenu, useToast } from '@/ui/overlay'
import { cachedBg, defaultBgIn, loadBg, storeBg } from './store'
import './pagebg.css'

/**
 * The dashboard's background ("Fon", lib/pageBg): PageBgScope (inside the dashboard, blockedit/DashFrame) reads the
 * owner's choice and puts it on the page while the dashboard is shown; BgPicker ("Fon ▾" in the edit bar) changes it.
 * They meet through a small store, since the edit bar sits outside the dashboard body.
 */
export interface BgControl {
  /** what the page shows now (the viewer's own "Ko'rinish" choice over the owner's default) */
  value: PageBg
  /** the owner's default for everyone (what "Fon ▾" in the edit bar sets) */
  base: PageBg
  options: PageBg[]
  canEdit: boolean
  set: (bg: PageBg) => void
}

let control: BgControl | null = null
const listeners = new Set<() => void>()
function publish(c: BgControl | null) {
  control = c
  listeners.forEach((l) => l())
}
export const useBgControl = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => control,
    () => control,
  )

export function PageBgScope() {
  const be = useBlockEdit()
  return be ? <Scope /> : null
}

function Scope() {
  const { t } = useT()
  const toast = useToast()
  const { scope, canEdit, editing, draftVersion } = useBlockEdit()!
  const design = useDesign()
  const mix = useLookMix()
  // an always-dark look (Midnight, an Aralash qorong'i / neon mood) has no white page; an Aralash yorug' no dark one
  const tone: LookTone = mix ? (mix.mood === 'light' ? 'light' : 'dark') : design && VARIANT_TRAITS[design].dark ? 'dark' : 'any'
  const scopeKey = scope.kind === 'live' ? `live:${scope.slug}` : `demo:${scope.id}`
  // the chosen background; null = nobody chose one, so the look's own (Liquid Glass: the orbs, Klassik: white)
  const [liveBg, setLiveBg] = useState<PageBg | null>(() => cachedBg(scope))
  // this editor's unpublished background (a live dashboard's draft, LiveDrafts): edit mode shows and changes it; "Saqlash"
  // publishes it with the blocks, "Bekor qilish" drops it (owner's review, 2026-11-04)
  const [draftBg, setDraftBg] = useState<PageBg | null>(null)
  const drafting = scope.kind === 'live' && editing
  const chosen = drafting && draftBg ? draftBg : liveBg
  const setBg = useCallback(
    (v: PageBg | null | ((b: PageBg | null) => PageBg | null)) => (drafting ? setDraftBg : setLiveBg)(v),
    [drafting],
  )
  const bg = chosen ?? defaultBgIn(design, scope)
  const latest = useRef(bg)
  latest.current = bg

  useEffect(() => {
    const ac = new AbortController()
    setLiveBg(cachedBg(scope))
    loadBg(scope, ac.signal).then(setLiveBg, () => undefined)
    if (scope.kind === 'live' && canEdit)
      loadDraft(scope, ac.signal).then(
        (d) => setDraftBg(isPageBg(d?.prefs?.background) ? d.prefs.background : null),
        () => undefined,
      )
    else setDraftBg(null)
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope; a published / dropped draft reads both again
  }, [scopeKey, canEdit, draftVersion])

  // this viewer's own background for this dashboard ("Ko'rinish", lib/viewLook), kept in their browser only
  useLayoutEffect(() => setViewScope(scopeKey), [scopeKey])
  useLayoutEffect(() => () => setViewScope(null), [])
  const view = useViewLook()
  const base = effectiveBg(bg, tone)
  const shown = view?.bg ? effectiveBg(view.bg, tone) : base
  useLayoutEffect(() => setPageBg(shown), [shown])
  useLayoutEffect(() => () => setPageBg(null), [])

  // "Fon ▾" is a step of the dashboard's "← Ortga" / "Oldinga →" (blockedit/history.ts "#bg"); an undo stores the
  // background back like a choice of its own, without a step of its own
  const putBack = useRef<(bg: PageBg | undefined) => void>(() => undefined)
  const recordStep = useSettingHistory<PageBg>('bg', (v) => putBack.current(v))
  const change = useCallback(
    (next: PageBg, remember: boolean) => {
      const before = latest.current
      if (next === before) return
      latest.current = next
      setBg(next)
      if (remember) recordStep(t(SHORT[next]), before, next)
      // a live dashboard's edit mode stores into the editor's draft; everyone else keeps the dashboard's background
      const store = drafting ? storeDraftPart(scope, 'prefs', { background: next }).then(() => next) : storeBg(scope, next)
      store.then(
        (stored) => setBg((b) => (b === next ? stored : b)),
        () => {
          setBg((b) => (b === next ? before : b))
          toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error')
        },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
    [scopeKey, toast, t, recordStep, drafting, setBg],
  )
  putBack.current = (v) => change(v ?? defaultBgIn(design, scope), false)
  const set = useCallback((next: PageBg) => change(next, true), [change])
  useLayoutEffect(() => {
    publish({ value: shown, base, options: bgsFor(tone), canEdit, set })
  }, [shown, base, tone, canEdit, set])
  useLayoutEffect(() => () => publish(null), [])
  return null
}

const LABEL: Record<PageBg, string> = {
  liquid: 'Liquid (rangli)',
  graphite: 'Grafit',
  soft: "Yumshoq yorug' (ko'kish)",
  white: 'Oq (toza)',
  gray: 'Kulrang (yumshoq)',
  ash: 'Kulrang (sokin)',
  paper: "Iliq (qog'oz)",
  night: "Yumshoq tun (grafit)",
  dim: 'Tumanli (xira)',
  slate: "Shifer (ko'k-kulrang)",
  navy: "Ko'k tun (to'q ko'k)",
  dark: "Qorong'i (grafit)",
}
const SHORT: Record<PageBg, string> = {
  liquid: 'Fon: Liquid',
  graphite: 'Fon: Grafit',
  soft: "Fon: Yumshoq yorug'",
  white: 'Fon: Oq',
  gray: 'Fon: Kulrang',
  ash: 'Fon: Kulrang (sokin)',
  paper: 'Fon: Iliq',
  night: 'Fon: Yumshoq tun',
  dim: 'Fon: Tumanli',
  slate: 'Fon: Shifer',
  navy: "Fon: Ko'k tun",
  dark: "Fon: Qorong'i",
}
/** the page colour of each (the same as --page-bg in pagebg.css) */
export const SWATCH: Record<PageBg, string> = {
  liquid: 'linear-gradient(135deg,#86b2ff,#b7a0ff 45%,#7adfcb)',
  graphite: 'radial-gradient(circle at 20% 20%,#3a5a9a,#1c1c1e 60%)',
  soft: '#eef3f9',
  white: '#f7f8fa',
  gray: '#e9ecf0',
  ash: '#eceef1',
  paper: '#f4f2ee',
  night: '#1b1d21',
  dim: '#2a2e35',
  slate: '#2a3442',
  navy: '#16233a',
  dark: '#1c1c1e',
}

/**
 * "Fon ▾" in the edit bar: the page behind the cards — the coloured Liquid orbs or a plain page — as the DEFAULT for
 * everyone (a viewer may still pick their own in "Ko'rinish", features/viewlook)
 */
export function BgPicker() {
  const { t } = useT()
  const c = useBgControl()
  if (!c?.canEdit) return null
  return (
    <DropMenu
      align="end"
      trigger={
        <Button size="sm" variant="ghost" icon={PaintBucket} iconRight={ChevronDown} data-bg-picker="">
          <span aria-hidden className="pagebg-swatch" style={{ background: SWATCH[c.base] }} />
          {t(SHORT[c.base])}
        </Button>
      }
      items={c.options.map((o) => ({ label: t(LABEL[o]), checked: o === c.base, onSelect: () => c.set(o) }))}
    />
  )
}
