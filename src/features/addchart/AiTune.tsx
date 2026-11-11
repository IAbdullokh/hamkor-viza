import { useState } from 'react'
import { Loader2, Sparkles, Undo2 } from 'lucide-react'
import { useT } from '@/i18n'
import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { useDb } from '@/data/db'
import type { DatasetRuntime } from '@/data/query'
import { useMeta } from '@/data/source'
import type { Lang } from '@/lib/settings'
import { Button, TextField } from '@/ui/controls'
import { catalog, toPreset } from './AiRecommend'
import { isTimeDim, type Preset } from './model'
import { preflight } from './preflight'
import { usePageSelectors } from './selectors'

/**
 * "✨ AI bilan o'zgartirish" at the top of the chart builder (owner, 2026-11-03): the chart as it is now + what to change
 * in words → POST /api/live/{slug}/tune-chart (Opus 5.5, medium effort, checked against the dashboard's fields) → the
 * builder's chart, checked again on the page's own data (toPreset + preflight), with a one-line summary of the change.
 * A few one-click requests fit the chart at hand; "Oldingi holat" undoes the last change (the builder keeps the history).
 */

const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

interface TuneReply {
  title?: string | null
  summary?: string | null
  chart?: Partial<Preset> | null
  error?: string | null
}

/** up to four one-click changes that fit this chart (Uzbek keys; sent as words in the dashboard language) */
export function tuneChips(d: Preset): string[] {
  const out: string[] = []
  if ((d.visual === 'column' || d.visual === 'bar') && d.dim === 'soat') out.push('Soat × hafta kuni issiqlik xaritasi', "Natija bo'yicha qatlamli (stacked)")
  if (d.dataset === 'leads') out.push("Bosqich bo'yicha qatlamli qilish", "Sifatli ulushni 2-chiziq qilib qo'shish")
  if (d.visual === 'line' || d.visual === 'column') out.push("O'rtacha qiymatdan maqsad chizig'i qo'shish")
  if (d.dim && !isTimeDim(d.dim)) out.push('Faqat eng katta 5 tasini qoldirish')
  return [...new Set(out)].slice(0, 4)
}

async function tune(slug: string, body: unknown): Promise<TuneReply> {
  const res = await fetch(`${BASE}/live/${encodeURIComponent(slug)}/tune-chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`tune ${res.status}`)
  return (await res.json()) as TuneReply
}

export function AiTuneBox({
  slug,
  draft,
  datasets,
  onApply,
  canUndo,
  onUndo,
}: {
  slug: string
  draft: Preset
  datasets: DatasetRuntime[]
  /** the changed chart; `renamed` = the AI gave it a name of its own */
  onApply: (p: Preset, renamed: boolean) => void
  canUndo: boolean
  onUndo: () => void
}) {
  const { t, lang } = useT()
  const db = useDb()
  const meta = useMeta()
  const { range, selectors } = usePageSelectors()
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null)

  const run = async (words: string) => {
    const request = words.trim().replace(/[<>]/g, '').slice(0, 300)
    if (!request || busy) return
    setBusy(true)
    setNote(null)
    try {
      const r = await tune(slug, { prompt: request, current: draft, fields: catalog(datasets), lang: lang as Lang })
      const draftOf = r.chart && toPreset(r.chart, r.title?.trim() || draft.title, datasets, meta.leadStageLabels as Record<string, string> | undefined)
      // the same check as an AI card: drawn on the page's own data, or not taken
      const checked = draftOf && preflight(db, draftOf, range, selectors)
      if (!checked) {
        setNote({ text: r.error ?? t("Bu o'zgarishda ma'lumot yo'q — boshqacha yozib ko'ring"), error: true })
        return
      }
      onApply({ ...checked, wide: draftOf.wide ?? draft.wide }, !!r.title && r.title.trim() !== draft.title)
      setNote({ text: r.summary?.trim() || t("Grafik o'zgartirildi"), error: false })
      setPrompt('')
    } catch {
      setNote({ text: t("AI o'zgartira olmadi — qayta urinib ko'ring"), error: true })
    } finally {
      setBusy(false)
    }
  }

  const chips = tuneChips(draft)
  return (
    <section aria-label={t("AI bilan o'zgartirish")} className="rounded-[18px] border border-[rgb(var(--accent-rgb)/0.25)] bg-primary-soft/40 p-3">
      <form
        className="flex items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void run(prompt)
        }}
      >
        <TextField
          aria-label={t("AI bilan o'zgartirish")}
          placeholder={t("AI bilan o'zgartirish: masalan, «hafta kuni bo'yicha issiqlik xaritasi qil» yoki «maqsad chizig'i qo'sh»…")}
          value={prompt}
          maxLength={300}
          disabled={busy}
          className="min-w-0 flex-1"
          onChange={(e) => setPrompt(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={busy || !prompt.trim()} className="mt-0.5 gap-1.5">
          {busy ? <Loader2 aria-hidden size={16} className="animate-spin" /> : <Sparkles aria-hidden size={16} />}
          {t("O'zgartirish")}
        </Button>
      </form>
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              disabled={busy}
              onClick={() => {
                setPrompt(t(c))
                void run(t(c))
              }}
              className="chip pressable min-h-[28px] text-[0.75rem] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              ✨ {t(c)}
            </button>
          ))}
        </div>
      )}
      {(note || canUndo) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.75rem]" aria-live="polite">
          {note && <span className={note.error ? 'text-danger' : 'rounded-full bg-surface px-2 py-0.5 text-ink-2'}>{note.text}</span>}
          {canUndo && (
            <button type="button" disabled={busy} onClick={onUndo} className="ms-auto inline-flex items-center gap-1 font-semibold text-primary-strong disabled:opacity-50">
              <Undo2 aria-hidden size={13} /> {t('Oldingi holat')}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
