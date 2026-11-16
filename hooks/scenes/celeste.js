// Celeste, niveau 1 : la montagne au coucher du soleil, dans l'esprit de la capture officielle 08 (celestegame.com) :
// ciel indigo qui vire au rose, à l'orange et au jaune, mer de nuages, vent en traits blancs, rochers violets,
// grands drapeaux cyan, magenta et verts qui flottent.
// Madeline y fait un HYPERDASH d'une corniche à l'autre, puis revient par un hyperdash inversé :
// elle court, se baisse en dash vers le sol, saute pendant le dash (saut bas et très rapide, 325 px/s selon le wiki),
// file au ras du vide, atterrit en dérapant. Cheveux : rose (2 dashes), blanc pendant le dash, auburn après, rose à l'atterrissage.
// Dessin original, sur une grille de 320 x 200 pixels (1 pixel = 5 unités du SVG), proche du 320 x 180 du jeu.
// RÈGLE : les sujets (rochers, drapeaux) restent sur les bords ; le centre n'a que du ciel, des nuages et du vent.
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.

import { W, H, Layer, mulberry32, noise, bandsSvg, disc } from './pixel.js'
import { madelineDefs } from './madeline.js'
import { timeline, run, madelineWithTrail, freezeCss } from './timeline.js'

const GROUND_Y = 150
const LEFT_EDGE = 108
const RIGHT_EDGE = 212
const SKY = ['#241e6e', '#3a2a8a', '#6a3a9a', '#b0488a', '#f0745a', '#ffa83c', '#ffe070']

const CLOUD_TONES = [
  { base: '#f07a5a', light: '#ff9a70' },
  { base: '#ffa83c', light: '#ffc860' },
  { base: '#ffd070', light: '#fff0a0' },
  { base: '#e8606a', light: '#ff8a8a' },
]

// Mer de nuages chaude, en grosses boules unies qui se chevauchent : plus on descend, plus c'est rose.
function clouds(rnd) {
  const l = new Layer()
  const pts = []
  for (let i = 0; i < 130; i++) pts.push([Math.round(rnd() * W), Math.round(104 + rnd() * 74), 6 + Math.floor(rnd() * 8)])
  pts.sort((p, q) => p[1] - q[1])
  for (const [x, y, r] of pts) {
    const tone = y < 122 ? '#ffe070' : y < 140 ? '#ffc050' : y < 156 ? '#ff9a50' : y < 168 ? '#f07a5a' : '#e8606a'
    disc(l, x, y, r, tone)
    if (rnd() < 0.5) disc(l, x - 2, y - 2, Math.max(2, r - 4), y < 122 ? '#fff0a0' : y < 140 ? '#ffd870' : y < 156 ? '#ffb070' : '#f89070')
  }
  return l
}

// Un rocher violet lointain, flottant, plus pâle.
function rockBlock(w, h) {
  const l = new Layer(w, h)
  for (let y = 0; y < h; y++) {
    const inset = y > h * 0.6 ? Math.round((y - h * 0.6) * 0.5) : 0
    for (let x = inset; x < w - inset; x++) l.set(x, y, y < 2 ? '#c8a0f0' : y < h * 0.5 ? '#9a62d0' : '#6a3ab0')
  }
  return l
}

// Une corniche de pierre violette : un haut clair, un corps tacheté, un dessous sombre en dents.
function ledge(side, rnd) {
  const l = new Layer()
  const top = (x) => GROUND_Y + Math.round(1.2 * noise(x * 0.4))
  const reach = (y) => (side === 'left' ? LEFT_EDGE : W - RIGHT_EDGE) + Math.round(3 * Math.sin(y * 0.4)) - (y > 168 ? Math.round((y - 168) * 0.9) : 0)
  for (let y = GROUND_Y - 3; y < H; y++) {
    for (let k = 0; k < Math.max(0, reach(y)); k++) {
      const x = side === 'left' ? k : W - 1 - k
      const t = top(x)
      if (y < t) continue
      const depth = y - t
      let c = '#6a3ab0'
      if (depth === 0) c = '#d8b0ff'
      else if (depth === 1) c = '#b890ec'
      else if (depth < 4) c = '#9a62d0'
      else if (rnd() < 0.08) c = '#8450c4'
      else if (rnd() < 0.05) c = '#4a2a88'
      l.set(x, y, c)
    }
  }
  return l
}

function pole(h) {
  const l = new Layer(3, h)
  for (let y = 0; y < h; y++) {
    l.set(0, y, '#a85a6a')
    l.set(1, y, '#7a3a52')
  }
  return l
}

// Un drapeau qui ondule : une bande dont chaque colonne est un peu plus haut ou plus bas, avec le bout déchiré.
function flag(w, h, color, dark, phase) {
  const l = new Layer(w + 3, h + 5)
  for (let i = 0; i < w; i++) {
    const off = Math.round(1.6 * Math.sin(i * 0.55 + phase))
    const cut = i > w - 5 ? Math.round((i - (w - 5)) * 1.2) : 0
    for (let j = cut; j < h - cut; j++) l.set(i, j + off + 2, j === cut || j === h - cut - 1 ? dark : color)
    if (i % 4 === 2) l.set(i, 2 + off + Math.floor(h / 2), dark)
  }
  return l
}

// Traits de vent : de longs filets blancs qui filent vers la droite, par paliers.
function wind(rnd) {
  let out = ''
  for (let i = 0; i < 26; i++) {
    const y = Math.round(10 + rnd() * 140)
    const len = 8 + Math.floor(rnd() * 24)
    const dur = (1.1 + rnd() * 1.6).toFixed(2)
    const lag = -(rnd() * 3).toFixed(2)
    out += `<g class="wind" style="animation-duration:${dur}s;animation-delay:${lag}s"><rect x="-40" y="${y}" width="${len}" height="1" fill="#ffffff" opacity="${(0.5 + rnd() * 0.45).toFixed(2)}"/></g>`
  }
  return out
}

function sparkles(rnd) {
  let out = ''
  for (let i = 0; i < 36; i++) {
    const x = Math.round(rnd() * W)
    const y = Math.round(rnd() * 100)
    out += `<path class="tw t${i % 3}" style="animation-delay:-${(rnd() * 6).toFixed(1)}s" fill="#ffe8ff" d="M${x} ${y}h1v1h-1z"/>`
  }
  return out
}

// ---------- Le parcours de Madeline : hyperdash aller, puis hyperdash inversé au retour ----------
const P = 7.5

function route() {
  const w = []
  const at = (t, x, y, n, pose, hair, flip) => w.push({ t, x, y, n, pose, hair, flip })
  at(0, 56, 150, 1, 'idle', 'pink', false)
  run(w, 0.8, 1.4, 56, 100, 150, false, 'pink')
  // Aller : dash vers le sol et saut pendant le dash. Le bras est tendu, les cheveux deviennent blancs.
  at(1.4, 100, 150, 3, 'duck', 'white', false)
  at(1.5, 108, 150, 4, 'dash', 'white', false) // elle quitte la corniche, très bas et très vite
  at(1.65, 155, 142, 4, 'air', 'red', false) // le dash est fini : cheveux auburn (il lui reste un dash)
  at(1.8, 200, 146, 2, 'fall', 'red', false)
  at(1.9, 212, 150, 3, 'run2', 'pink', false) // elle atterrit en dérapant : le dash est rendu, cheveux roses
  at(2.2, 228, 150, 1, 'idle', 'pink', false)
  run(w, 2.6, 3.05, 228, 264, 150, false, 'pink')
  at(3.05, 264, 150, 1, 'idle', 'pink', false)
  at(3.4, 264, 150, 1, 'idle', 'pink', true) // elle se retourne
  run(w, 3.9, 4.45, 264, 220, 150, true, 'pink')
  // Retour : le même hyperdash, en sens inverse.
  at(4.45, 220, 150, 3, 'duck', 'white', true)
  at(4.55, 212, 150, 4, 'dash', 'white', true)
  at(4.7, 165, 142, 4, 'air', 'red', true)
  at(4.85, 120, 146, 2, 'fall', 'red', true)
  at(4.95, 108, 150, 3, 'run2', 'pink', true)
  at(5.25, 92, 150, 1, 'idle', 'pink', true)
  run(w, 5.65, 6.1, 92, 56, 150, true, 'pink')
  at(6.1, 56, 150, 1, 'idle', 'pink', true)
  at(6.45, 56, 150, 1, 'idle', 'pink', false) // elle se retourne vers la droite
  return w
}

const CSS = `${timeline(P, route())}
.wind{animation:wind 1.6s steps(26,end) infinite}
@keyframes wind{from{transform:translateX(0)}to{transform:translateX(400px)}}
.fa{animation:fa 0.6s steps(1,end) infinite}
.fb{animation:fb 0.6s steps(1,end) infinite}
@keyframes fa{0%{opacity:1}50%{opacity:0}}
@keyframes fb{0%{opacity:0}50%{opacity:1}}
.tw{animation:tw 3s steps(1,end) infinite}
.t1{animation-duration:4.3s}
.t2{animation-duration:2.6s}
@keyframes tw{0%{opacity:1}45%{opacity:.25}70%{opacity:1}}
.drift{animation:drift 40s steps(20,end) infinite alternate}
@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-12px)}}
@media (prefers-reduced-motion: reduce){*{animation:none !important}}`

// Un drapeau sur son mât : deux images qui alternent pour le battement.
function banner(x, y, h, w, color, dark) {
  const a = flag(w, 9, color, dark, 0)
  const b = flag(w, 9, color, dark, 2.2)
  return (
    `<g transform="translate(${x} ${y})">${pole(h).svg()}` +
    `<g class="fa" transform="translate(2 2)">${a.svg()}</g><g class="fb" transform="translate(2 2)">${b.svg()}</g></g>`
  )
}

export function celesteSvg(at) {
  const rnd = mulberry32(8)
  const sea = clouds(rnd)
  const ledgeL = ledge('left', rnd)
  const ledgeR = ledge('right', rnd)
  const block = rockBlock(26, 14)
  const farBlock = rockBlock(18, 9)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" ` +
    `preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges"><style>${CSS}${freezeCss(at)}</style>` +
    `<defs>${madelineDefs()}</defs><g transform="scale(5)">` +
    bandsSvg('c', SKY, 0, 160) +
    `<rect y="150" width="320" height="50" fill="#e8806a"/>` +
    sparkles(rnd) +
    `<g class="drift">${sea.svg()}</g>` +
    // Décor lointain, pâle, au centre : deux petits rochers flottants avec leurs mâts.
    `<g opacity=".4"><g transform="translate(120 96)">${farBlock.svg()}</g><g transform="translate(188 110)">${farBlock.svg()}</g></g>` +
    `<g opacity=".4">${banner(129, 72, 24, 13, '#3ac8e8', '#1f8aa8')}${banner(197, 86, 24, 13, '#e83a9a', '#a02070')}</g>` +
    // Rochers et mâts sur les bords.
    `<g transform="translate(24 84)">${block.svg()}</g>` +
    `<g transform="translate(272 70)">${block.svg()}</g>` +
    ledgeL.svg() +
    ledgeR.svg() +
    banner(20, 100, 50, 17, '#3ac8e8', '#1f8aa8') +
    banner(48, 94, 56, 17, '#e83a9a', '#a02070') +
    banner(256, 96, 54, 17, '#6ad858', '#3a9a38') +
    banner(288, 102, 48, 17, '#3ac8e8', '#1f8aa8') +
    madelineWithTrail(at) +
    wind(rnd) +
    `</g></svg>`
  )
}
