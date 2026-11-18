/** Deterministic randomness: same seed → same numbers on every reload (drill-downs always add up). */

export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export type Rng = () => number

/** mulberry32 — small, fast and stable for a given seed. */
export function rng(seed: string): Rng {
  let a = hash(seed)
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!

/** Weighted pick — `w[i]` is the relative weight of `xs[i]`. */
export function pickW<T>(r: Rng, xs: readonly T[], w: readonly number[]): T {
  const total = w.reduce((a, b) => a + b, 0)
  let x = r() * total
  for (let i = 0; i < xs.length; i++) {
    x -= w[i]!
    if (x <= 0) return xs[i]!
  }
  return xs[xs.length - 1]!
}

export const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))

/** Roughly normal (sum of 3 uniforms), mean 0, sd ≈ 1. */
export const gauss = (r: Rng) => (r() + r() + r() - 1.5) * 2

/** Poisson-ish count with the given mean (normal approximation, never negative). */
export function count(r: Rng, mean: number): number {
  if (mean <= 0) return 0
  if (mean < 12) {
    // Knuth for small means
    const L = Math.exp(-mean)
    let k = 0
    let p = 1
    do {
      k++
      p *= r()
    } while (p > L)
    return k - 1
  }
  return Math.max(0, Math.round(mean + gauss(r) * Math.sqrt(mean)))
}
