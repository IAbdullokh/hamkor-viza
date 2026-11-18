/**
 * Soft pastel orbs behind all glass surfaces. Pre-blurred gradients (no filter: blur) that never move,
 * so the frosted surfaces above them are drawn once instead of on every frame.
 */
export function Wallpaper() {
  return (
    <div className="wallpaper" aria-hidden>
      <div className="orb o1" />
      <div className="orb o2" />
      <div className="orb o3" />
      <div className="orb o4" />
      <div className="orb o5" />
    </div>
  )
}
