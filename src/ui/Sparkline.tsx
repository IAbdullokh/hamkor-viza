import { useId } from 'react'
import { cx } from '@/lib/cx'

/**
 * Tiny SVG trend line (Applekor style): 1.75px stroke, 8% area fill, draw-in animation,
 * dot with a white ring on the last point. Cheap enough to put in every KPI card.
 */
export function Sparkline({ values, color = 'var(--primary)', className }: { values: number[]; color?: string; className?: string }) {
  const id = useId().replace(/:/g, '')
  const W = 120
  const H = 36
  const P = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [P + (i / (values.length - 1)) * (W - P * 2), P + (1 - (v - min) / span) * (H - P * 2)] as const)
  // a smooth curve through every point (Catmull-Rom as cubic Béziers), not sharp corners
  let line = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2] ?? p2
    const c1y = Math.min(H - P, Math.max(P, p1[1] + (p2[1] - p0[1]) / 6))
    const c2y = Math.min(H - P, Math.max(P, p2[1] - (p3[1] - p1[1]) / 6))
    line += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${c1y.toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  const area = `${line} L${W - P} ${H} L${P} ${H} Z`
  const last = pts[pts.length - 1]!
  return (
    <span className={cx('relative block', className)} style={{ width: '100%', height: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }} aria-hidden>
        <defs>
          <linearGradient id={`sf${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.22" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <clipPath id={`sc${id}`}>
            <rect x="0" y="-4" width={W} height={H + 8} className="spark-reveal" />
          </clipPath>
        </defs>
        <g clipPath={`url(#sc${id})`}>
          <path d={area} fill={`url(#sf${id})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      {/* the last point stays a circle however the line is stretched */}
      <span
        aria-hidden
        className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-[1.5px] ring-white"
        style={{ left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%`, background: color }}
      />
    </span>
  )
}
