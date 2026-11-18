/**
 * Where the numbers come from:
 *  - "live" (npm run dev, npm run build): the published server's API, after the dashboard's viewer login;
 *  - "demo" (npm run dev:demo, npm run build:demo): Studio's seeded demo generator in the browser — no server, no login,
 *    no client data.
 */
export type DataMode = 'live' | 'demo'

export function dataModeOf(viteMode: string | undefined, flag: string | undefined): DataMode {
  return viteMode === 'demo' || flag === 'demo' ? 'demo' : 'live'
}

export const DATA_MODE: DataMode = dataModeOf(import.meta.env.MODE, import.meta.env.VITE_DATA_MODE as string | undefined)

/** the API prefix the app calls ('/api' = same origin; vite.config.ts sets it) */
export const API: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
