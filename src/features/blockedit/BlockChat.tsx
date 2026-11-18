// Standalone app (export-app): only the types the dashboard code uses, cut from Studio's features/blockedit/BlockChat.tsx.
import type { ModelTier, ThinkMode } from '@/features/projects/types'
import type { NovaPatch } from './patch'

export interface ChatReply {
  reply: string
  clarify?: boolean
  propose?: boolean
  chip?: string | null
  patch?: NovaPatch | null
  /** the whole dashboard's stage source to change after "Ha" (stagesource.ts) */
  stageSource?: 'report' | 'crm' | null
  /** Nova already did it with its tools (BlockAgent.cs): the page applies and saves the patch at once, with its undo */
  applied?: boolean
  /** what Nova did on the way, one short line each ("Bitrix bosqichlari o'qildi", "Ustun qo'shildi: «…»") */
  steps?: string[]
  /** the project's data was refreshed (the dashboard picks the new snapshot up by itself) */
  refreshed?: boolean
  /** which thinking mode, tier and model answered; none when it was done without a model */
  mode?: ThinkMode | null
  tier?: ModelTier | null
  model?: string | null
}
