import { createContext, useContext } from 'react'
import { Check } from 'lucide-react'
import { useT } from '@/i18n'
import type { DesignId } from '@/lib/design'
import { designPatch, updateViewLook, useViewLook } from '@/lib/viewLook'
import { useResolvedTheme } from '@/shell/ThemeController'
import { useBlockEdit } from '@/features/blockedit/context'
import { uiLabel } from '@/features/projects/labels'
import type { UiId } from '@/features/projects/types'
import { lookDesign, uiPreviewId } from '@/features/projects/look/uis'

/**
 * "Dizayn" in Ko'rinish (owner 2026-10-27): the looks a live dashboard renders with its own data (the Look step's Liquid
 * variants, the same thumbnails and names). A viewer's pick is theirs only (lib/viewLook `design`); in the edit mode the
 * owner's pick is the dashboard's look for everyone (the project's `ui`, saved by LivePage through PATCH /projects — the
 * live info reads it, nothing is rebuilt).
 */
export interface LookDesignControl {
  /** the owner's look for everyone (a preset or an Aralash mix) */
  base: UiId
  /** may set `base` (an editor of the project, in the edit mode) */
  canSet: boolean
  setBase: (d: DesignId) => void
}

export const LookDesignCtx = createContext<LookDesignControl | null>(null)

/** the look the dashboard shows now: the viewer's own Dizayn over the owner's, the owner's while editing */
export function useShownUi(base: UiId): UiId {
  const be = useBlockEdit()
  const view = useViewLook()
  return !be?.editing && view?.design ? view.design : base
}

export function DesignTiles() {
  const { t } = useT()
  const c = useContext(LookDesignCtx)
  const be = useBlockEdit()
  const view = useViewLook()
  const theme = useResolvedTheme()
  if (!c) return null
  const asOwner = c.canSet && !!be?.editing
  const current: UiId = asOwner ? c.base : (view?.design ?? c.base)
  // only Liquid Glass is offered (owner, 2026-11-03); a dashboard still set to another look shows it, ticked here
  const tiles: UiId[] = ['glass']
  const shown = (ui: UiId): UiId => (lookDesign(ui) ? 'glass' : ui)

  const pick = (ui: UiId) => {
    const d = lookDesign(ui)
    if (!d) return
    if (asOwner) {
      if (ui !== c.base) c.setBase(d)
      // the owner's own Dizayn would hide the new default from them after the edit mode
      updateViewLook({ design: undefined })
    } else updateViewLook(ui === c.base ? { design: undefined } : designPatch(d, c.base))
  }

  return (
    <div role="radiogroup" aria-label={t('Dizayn')} className="grid grid-cols-3 gap-2">
      {tiles.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={o === shown(current)} onClick={() => pick(o)} className="vl-bg pressable" data-on={o === shown(current) || undefined} data-design-tile={o}>
          <span aria-hidden className="vl-thumb vl-design">
            <img src={`./previews/${uiPreviewId(o)}-${theme}.jpg`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
            {o === shown(current) && (
              <b>
                <Check size={11} strokeWidth={3.5} />
              </b>
            )}
          </span>
          <span className="vl-name">{uiLabel(t, o)}</span>
        </button>
      ))}
    </div>
  )
}
