import { BadgeDollarSign, CalendarDays, Megaphone, MessagesSquare, PhoneCall, Shuffle, ShoppingBag, Target, Users, type LucideIcon } from 'lucide-react'
import type { TileColor } from '@/ui/glass'
import type { DesignId } from '@/lib/design'

/**
 * The ONE default dashboard every client gets from a single Bitrix24 key, and the designs it can be shown in.
 * Same pages, same numbers in every design.
 */
export type PageId = 'lead' | 'deal' | 'calls' | 'kampaniyalar' | 'hisobot' | 'reja' | 'taqsimot' | 'chatlar' | 'savdo'

/**
 * `projectOnly`: the page reads tables only a project snapshot has (chats from Telegram / Wazzup / Instagram / WhatsApp,
 * sales from Billz). The demo route (/d/glass/*) never shows it; a live project shows it when meta.pages lists it.
 */
export const PAGES: { id: PageId; title: string; icon: LucideIcon; tile: TileColor; dashboard?: string; projectOnly?: boolean }[] = [
  { id: 'lead', title: 'Lidlar', icon: Users, tile: 'blue', dashboard: 'main-lead' },
  { id: 'deal', title: 'Sdelkalar', icon: BadgeDollarSign, tile: 'green', dashboard: 'main-deal' },
  { id: 'calls', title: "Qo'ng'iroqlar", icon: PhoneCall, tile: 'teal', dashboard: 'main-calls' },
  { id: 'kampaniyalar', title: 'Kampaniyalar', icon: Megaphone, tile: 'purple', dashboard: 'main-kampaniyalar' },
  { id: 'hisobot', title: 'Kunlik hisobot', icon: CalendarDays, tile: 'orange', dashboard: 'main-hisobot' },
  { id: 'reja', title: 'Reja', icon: Target, tile: 'pink' },
  { id: 'taqsimot', title: 'Taqsimot', icon: Shuffle, tile: 'indigo' },
  { id: 'chatlar', title: 'Chatlar', icon: MessagesSquare, tile: 'cyan', projectOnly: true },
  { id: 'savdo', title: 'Savdo', icon: ShoppingBag, tile: 'orange', projectOnly: true },
]

/** the pages of the demo dashboard (/d/glass/*): the 7 that run on the demo generator */
export const DEMO_PAGES = PAGES.filter((p) => !p.projectOnly)

export interface DesignDef {
  id: DesignId
  title: string
  /** swatches for the catalog card preview */
  bg: string
  card: string
  ink: string
  muted: string
  accent: string
  chart: [string, string, string]
}

/**
 * Data365 Studio's own dashboard UIs (the default dashboard, 7 pages): Liquid Glass, and Klassik (2026-11-04) (owner, 2026-11-03: Bento,
 * Midnight, Minimal and Glass Pro had too many effects and read badly — they are not offered anywhere; lib/design
 * setDesign shows Liquid Glass for a dashboard still set to one of them). RETIRED_DESIGNS keeps their swatches.
 */
export const DESIGNS: DesignDef[] = [
  { id: 'glass', title: 'Liquid Glass', bg: 'linear-gradient(135deg,#c9dafe 0%,#efe9ff 45%,#fde4d6 75%,#c9f1e6 100%)', card: 'rgba(255,255,255,.62)', ink: '#1d1d1f', muted: '#6b6b70', accent: '#4a6de4', chart: ['#3d5fd6', '#21a595', '#7c6be6'] },
  // the earlier Data365 dashboard (ORIGINALS 'klassik') rebuilt as a look of Studio's own pages: editable like Liquid Glass
  { id: 'klassik', title: 'Klassik', bg: '#f4f6fa', card: '#ffffff', ink: '#1a1f36', muted: '#6b7280', accent: '#2196f3', chart: ['#2196f3', '#00bcd4', '#ff9800'] },
]

/** the looks taken out of every picker (kept so an old link or project still resolves to a known look) */
export const RETIRED_DESIGNS: DesignDef[] = [
  { id: 'bento', title: 'Bento', bg: '#f3f2ee', card: '#ffffff', ink: '#16161a', muted: '#6e6e76', accent: '#5b5bf0', chart: ['#5b5bf0', '#16b39a', '#ff8a3d'] },
  { id: 'midnight', title: 'Midnight', bg: '#07090f', card: '#0f141f', ink: '#e8edf7', muted: '#8a94a8', accent: '#22d3ee', chart: ['#22d3ee', '#e879f9', '#a3e635'] },
  { id: 'minimal', title: 'Minimal', bg: '#fbfbf9', card: '#ffffff', ink: '#111111', muted: '#707070', accent: '#111111', chart: ['#111111', '#8a8a8a', '#d0402b'] },
  { id: 'glasspro', title: 'Glass Pro', bg: 'linear-gradient(135deg,#a9c1ff 0%,#d9c8ff 40%,#ffc9dc 70%,#a8ecdf 100%)', card: 'rgba(255,255,255,.5)', ink: '#14142b', muted: '#5f6078', accent: '#6d5ef6', chart: ['#6d5ef6', '#14b8a6', '#f472b6'] },
]

/**
 * Dashboard UIs Data365 already uses — copied as is (uis/<folder>), only the data replaced with mock data.
 * Client-facing names are neutral; project / client names must never appear in the UI.
 * In dev each runs on its own port; in a build it is served from ./ui/<id>/.
 */
export interface OriginalDef {
  /** neutral id used in the URL (never a project/client name) */
  id: string
  /** internal folder under uis/ — never shown to clients */
  folder: string
  title: string
  port: number
  /** an industry example of «Namunalar» (features/showcase): not a look to choose, so it isn't in Katalog */
  example?: boolean
}

export const ORIGINALS: OriginalDef[] = [
  { id: 'klassik', folder: 'mountain', title: 'Klassik', port: 5183 },
  { id: 'statistik', folder: 'kdavo', title: 'Statistik', port: 5184 },
  { id: 'kompakt', folder: 'powergym', title: 'Kompakt', port: 5185 },
  { id: 'logistika', folder: 'ethno', title: 'Logistika', port: 5186, example: true },
  { id: 'oylik', folder: 'oylik', title: 'HR va oylik', port: 5246, example: true },
  { id: 'kitob', folder: 'kitob', title: 'Kitob savdosi', port: 5250, example: true },
  { id: 'talim', folder: 'talim', title: "Ta'lim", port: 5238, example: true },
  { id: 'erp', folder: 'erp', title: 'ERP tizimi', port: 5260, example: true },
]

// built into public/ui/<id> (each copy's own vite build, base './'): the same address on this Mac and online
export const originalUrl = (o: OriginalDef) => `./ui/${o.id}/index.html`
export const getOriginal = (id: string) => ORIGINALS.find((o) => o.id === id)

export const getDesign = (id: string) => DESIGNS.find((d) => d.id === id)
export const getPage = (id: string) => PAGES.find((p) => p.id === id)
export const getDemoPage = (id: string) => DEMO_PAGES.find((p) => p.id === id)
