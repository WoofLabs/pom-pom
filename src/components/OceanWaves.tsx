'use client'

// Layered waves, each filled with a flowing gradient (orange or blue).
//
// Performance: everything that moves is moved with `transform` / `opacity` only, which the GPU
// can do without repainting. (Animating mask-position / background-position, blurring with a CSS
// filter, or scaling the blurred waves forces repaints and made the box's move animation stutter.)
//   • The soft, blurry edge is baked into the wave mask image itself (an SVG blur), drawn once.
//   • Each layer's "roller" slides left by two wave tiles per loop (the rolling water).
//   • Inside it, wide gradient strips slide by one colour tile (the moving colours).

// One wave tile is 1440 units wide (a crest and a trough). The path is drawn three tiles wide
// (-1440 … 2880) so the blur near the tile edges matches the neighbouring tiles: no seams.
// Avoiding faint lines:
//  • The viewBox starts at y=-160, leaving room above the crests so the blur fades out fully
//    instead of being cut off at the top of the image.
//  • The image's bottom rows (330…340) are left transparent. When the browser repeats the mask
//    sideways, it can blend the image's top row with its bottom row; with a solid bottom row that
//    showed as a hairline along the top of each layer. Those rows sit below the screen anyway.
const MASK_TOP = -160, MASK_H = 500, CREST_Y = 40
export const CREST_FRACTION = (CREST_Y - MASK_TOP) / MASK_H // where the crests sit within a layer
function waveMask(blur: number) {
  let d = 'M-1440 120'
  for (let x = -1440; x < 2880; x += 1440) {
    d += ` C${x + 240} ${CREST_Y} ${x + 480} ${CREST_Y} ${x + 720} 120 C${x + 960} 200 ${x + 1200} 200 ${x + 1440} 120`
  }
  d += ' V900 H-1440 Z'
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 ${MASK_TOP} 1440 ${MASK_H}' preserveAspectRatio='none'>` +
    `<filter id='b' filterUnits='userSpaceOnUse' x='-1440' y='-600' width='4320' height='1800'>` +
    `<feGaussianBlur stdDeviation='${blur}'/></filter>` +
    `<clipPath id='c'><rect x='-1440' y='${MASK_TOP}' width='4320' height='${330 - MASK_TOP}'/></clipPath>` +
    `<g clip-path='url(#c)'><path d='${d}' fill='black' filter='url(#b)'/></g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// Back to front, filling the whole screen when risen: the back layer's crests reach the top
// edge, each layer in front sits lower and stronger. `blur` is the soft edge, in wave-tile units.
// `color`: each layer is blue or orange, alternating, both while peeking and once risen.
// `roll` is seconds per loop; each loop travels two wave tiles (see .ocean-roller in globals.css).
// `h`: layer height as a fraction of the screen. `peekCrest`: while peeking on the home page,
// how far up the screen (fraction from the bottom) this layer's crests sit.
const LAYERS = [
  { h: 1.5,  peekCrest: 0.42, opacity: 0.6, roll: 40, reverse: true,  colorDelay: -0.5, blur: 26, color: 'blue' },
  { h: 1.1,  peekCrest: 0.34, opacity: 0.7, roll: 30, reverse: false, colorDelay: -1.5, blur: 22, color: 'orange' },
  { h: 0.84, peekCrest: 0.26, opacity: 0.8, roll: 24, reverse: true,  colorDelay: -2.5, blur: 18, color: 'blue' },
  { h: 0.58, peekCrest: 0.18, opacity: 0.9, roll: 18, reverse: false, colorDelay: -1.0, blur: 14, color: 'orange' },
  { h: 0.34, peekCrest: 0.10, opacity: 1,   roll: 14, reverse: true,  colorDelay: 0,    blur: 10, color: 'blue' },
].map(l => ({
  ...l,
  mask: waveMask(l.blur),
  // Risen: crests sit at (1 - h + CREST_FRACTION·h) of the screen. Peeking: at (1 - peekCrest).
  // The difference is a plain vertical slide (GPU-cheap), in vh, rounded to whole pixels:
  // a fractional-pixel offset misaligns the wave mask and its colours, leaving a hairline.
  peekShift: `round(${((1 - CREST_FRACTION) * l.h - l.peekCrest) * 100}vh, 1px)`,
}))

function GradientStrip({ delay, orange }: { delay: number; orange?: boolean }) {
  return (
    <div
      className={`ocean-colors ${orange ? 'ocean-colors-orange' : ''}`}
      style={{ animationDelay: `${delay}s` }}
    />
  )
}

// `full`: waves fill the whole page. Otherwise they peek along the bottom: each layer slides
// down so its crests sit low on the screen, keeping the layering. Orange and blue either way.
export default function OceanWaves({ full }: { full: boolean }) {
  return (
    <div aria-hidden className="ocean pointer-events-none fixed inset-0 overflow-hidden">
      {/* Faint deep-water wash so even the top of the page is coloured once risen.
          Hidden while peeking: it's a plain rectangle and would show a hard top edge. */}
      <div
        className="absolute inset-0 overflow-hidden transition-opacity duration-500 ease-out"
        style={{ opacity: full ? 0.45 : 0 }}
      >
        <GradientStrip delay={0} />
      </div>

      {LAYERS.map((l, i) => {
        const orange = l.color === 'orange'
        return (
          <div
            key={i}
            // No overflow-hidden here: clipping each layer's edges while it slides left hairlines
            // along the layer tops mid-transition. The outer .ocean container already clips.
            className="absolute inset-x-0 transition-transform duration-500 ease-out"
            style={{
              // extend past the screen's bottom so the wave body never shows a soft bottom edge
              bottom: -60, height: `calc(${l.h * 100}% + 60px)`, opacity: l.opacity,
              transform: full ? 'none' : `translateY(${l.peekShift})`,
              willChange: 'transform',
            }}
          >
            <div
              className="ocean-roller"
              style={{
                WebkitMaskImage: l.mask,
                maskImage: l.mask,
                animationDuration: `${l.roll}s`,
                animationDelay: `${-i * 2}s`,
                animationDirection: l.reverse ? 'reverse' : 'normal',
              }}
            >
              <GradientStrip delay={l.colorDelay} orange={orange} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
