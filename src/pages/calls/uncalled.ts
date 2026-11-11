import type { Column } from '@/kit/DataTable'
import type { Call, Lead } from '@/data/types'
import { answered, fmtDT, isIn, type UncalledLead } from './calc'

type T = (key: string, vars?: Record<string, string | number>) => string

/** a call as one line of proof: which way, picked up or not, when */
export function callLine(t: T, c: Call): string {
  return `${isIn(c) ? t('Kiruvchi') : t('Chiquvchi')} · ${answered(c) ? t('Javob berilgan') : t('Javobsiz')} · ${fmtDT(c.ts)}`
}

/**
 * The leads nobody called yet, shown so the number can be checked (owner, 2026-11-09: "operators blame us that we get wrong numbers,
 * we have to prove everything"): the lead and when it came, whose it is, its stage now, and every call found for it anyway —
 * none means none at all; a call the client made, or one before the lead came, is there to be seen.
 */
export function uncalledColumns(t: T): Column<UncalledLead<Lead>>[] {
  return [
    { key: 'lead', label: t('Lid'), value: (r) => r.lead.id, render: (r) => `#${r.lead.id}${r.lead.name ? ` · ${r.lead.name}` : ''}` },
    { key: 'ts', label: t('Kelgan vaqti'), value: (r) => r.lead.ts, render: (r) => fmtDT(r.lead.ts) },
    { key: 'source', label: t('Manba'), value: (r) => r.lead.source },
    { key: 'manager', label: t("Mas'ul"), value: (r) => r.lead.manager },
    { key: 'stage', label: t('Bosqich'), value: (r) => r.lead.stage_name ?? r.lead.stage },
    {
      key: 'calls',
      label: t("Topilgan qo'ng'iroqlar"),
      value: (r) => r.calls.length,
      render: (r) => (r.calls.length ? t("{n} ta · oxirgisi: {what}", { n: r.calls.length, what: callLine(t, r.calls[0]!) }) : '—'),
    },
  ]
}
