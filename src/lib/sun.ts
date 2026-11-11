/**
 * Sunrise / sunset for Tashkent (NOAA simplified algorithm). Used by the "auto" theme
 * (dark after sunset) and by the living-sky wallpaper.
 */
export const TASHKENT = { lat: 41.2995, lon: 69.2401, tz: 5 }

const rad = Math.PI / 180

/** Returns sunrise and sunset as fractional local hours (e.g. 6.62 = 06:37). */
export function sunTimes(date: Date, loc = TASHKENT): { rise: number; set: number } {
  const start = Date.UTC(date.getFullYear(), 0, 0)
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000)
  const g = ((2 * Math.PI) / 365) * (day - 1)
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(loc.lat * rad) * Math.cos(decl)) - Math.tan(loc.lat * rad) * Math.tan(decl)) / rad
  const noon = 720 - 4 * loc.lon - eqtime
  const rise = (noon - 4 * ha) / 60 + loc.tz
  const set = (noon + 4 * ha) / 60 + loc.tz
  return { rise, set }
}

/** Current Tashkent local hour (fractional), independent of the viewer's own timezone. */
export function tashkentHour(now = new Date()): number {
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600
  return (utcH + TASHKENT.tz + 24) % 24
}

export function isDaylight(now = new Date()): boolean {
  const { rise, set } = sunTimes(now)
  const h = tashkentHour(now)
  return h >= rise + 0.25 && h < set - 0.25
}
