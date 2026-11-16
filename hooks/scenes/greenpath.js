// Greenpath : une grotte verdoyante en pixel art, un lac en bas, un banc et un petit chevalier au masque blanc.
// Le tout est dessiné sur une grille de 160 x 100 "pixels" (chaque pixel = 10 unités du SVG), avec des animations
// qui avancent par paliers (steps) pour garder l'effet pixel : lucioles, lianes, ondes du lac, respiration du chevalier.
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.
// Le centre reste calme : l'intérêt est sur les bords (parois, plafond, rive à droite, lac en bas).

const W = 160
const H = 100
const LAKE = 84

function mulberry32(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const noise = (x) => Math.sin(x * 0.37) + 0.5 * Math.sin(x * 0.91 + 2)
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// Une grille de pixels colorés qui sort en un <path> par couleur (des traits horizontaux fusionnés).
class Layer {
  constructor(w = W, h = H) {
    this.w = w
    this.h = h
    this.rows = Array.from({ length: h }, () => new Array(w).fill(null))
  }
  set(x, y, c) {
    x = Math.round(x)
    y = Math.round(y)
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.rows[y][x] = c
  }
  get(x, y) {
    return x >= 0 && x < this.w && y >= 0 && y < this.h ? this.rows[y][x] : null
  }
  svg() {
    const byColor = new Map()
    for (let y = 0; y < this.h; y++) {
      let x = 0
      while (x < this.w) {
        const c = this.rows[y][x]
        if (c === null) {
          x++
          continue
        }
        let end = x
        while (end + 1 < this.w && this.rows[y][end + 1] === c) end++
        const len = end - x + 1
        byColor.set(c, (byColor.get(c) ?? '') + `M${x} ${y}h${len}v1h-${len}z`)
        x = end + 1
      }
    }
    return [...byColor].map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')
  }
}

// Dessine un sprite à partir de lignes de texte et d'une palette (le point = vide).
function sprite(lines, palette) {
  const layer = new Layer(lines[0].length, lines.length)
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const c = palette[line[x]]
      if (c) layer.set(x, y, c)
    }
  })
  return layer
}

// Contour d'un calque : les pixels vides à côté d'un pixel plein (pour détacher un sprite du fond sombre).
function outlineOf(layer, color) {
  const out = new Layer(layer.w, layer.h)
  for (let y = 0; y < layer.h; y++) {
    for (let x = 0; x < layer.w; x++) {
      if (layer.get(x, y)) continue
      if (layer.get(x - 1, y) || layer.get(x + 1, y) || layer.get(x, y - 1) || layer.get(x, y + 1)) out.set(x, y, color)
    }
  }
  return out
}

const BANDS = ['#04100d', '#061a15', '#082219', '#0a2b21', '#0d352a']
const WATER = ['#0d3b38', '#0a3130', '#08272b', '#061d23', '#041319']

// Fond : des bandes de couleur douces, avec un dégradé tramé (dither) seulement dans les zones de passage.
function background() {
  const l = new Layer()
  for (let y = 0; y < H; y++) {
    const water = y >= LAKE
    const bands = water ? WATER : BANDS
    const span = water ? H - LAKE : LAKE
    const f = (((water ? y - LAKE : y) + 0.5) / span) * (bands.length - 1)
    const i = Math.min(Math.floor(f), bands.length - 2)
    const frac = clamp((f - i - 0.35) / 0.3, 0, 1)
    for (let x = 0; x < W; x++) {
      const next = BAYER[y & 3][x & 3] / 16 < frac
      l.set(x, y, bands[next ? i + 1 : i])
    }
  }
  return l
}

// Stalactites lointaines, plus claires que le fond, pour la profondeur.
function farRocks(rnd) {
  const l = new Layer()
  for (let xc = 3; xc < W; xc += 8 + Math.floor(rnd() * 5)) {
    const len = 8 + Math.floor(rnd() * 14)
    const base = 5 + Math.floor(rnd() * 3)
    for (let dy = 0; dy < len; dy++) {
      const hw = Math.round((base / 2) * (1 - dy / len))
      for (let dx = -hw; dx <= hw; dx++) l.set(xc + dx, dy, '#0a2620')
    }
  }
  return l
}

const groundTop = (x) => {
  if (x >= 114) return 72
  if (x >= 98) return 72 + (114 - x) * 0.75
  if (x <= 20) return 78
  if (x <= 36) return 78 + (x - 20) * 0.4
  return Infinity
}

const ROCK = '#0b1f1a'
const ROCK_DARK = '#08150f'
const RIM = '#1c4d40'
const MOSS = ['#2d7a3c', '#3c8f48', '#4aa352']

// Plafond, parois, stalactites et rive : toute la roche, avec un liseré clair et de la mousse sur les bords.
function cave(rnd) {
  const l = new Layer()
  const ceil = (x) => clamp(Math.round(4 + 1.6 * noise(x * 0.6)), 1, 8)
  for (let x = 0; x < W; x++) for (let y = 0; y < ceil(x); y++) l.set(x, y, ROCK)

  const spikes = [4, 12, 19, 27, 38, 52, 66, 79, 93, 104, 117, 127, 139, 150, 156]
  for (const xc of spikes) {
    const edge = xc < 40 || xc > 115
    const len = edge ? 8 + Math.floor(rnd() * 7) : 4 + Math.floor(rnd() * 4)
    const base = edge ? 5 : 4
    for (let dy = 0; dy < len; dy++) {
      const hw = Math.round((base / 2) * (1 - dy / len))
      for (let dx = -hw; dx <= hw; dx++) l.set(xc + dx, ceil(xc) + dy - 1, ROCK)
    }
  }

  for (let y = 0; y < H; y++) {
    const wl = 7 + 23 * Math.pow(Math.max(0, 1 - y / LAKE), 1.6) + 1.4 * noise(y * 0.5)
    for (let x = 0; x < wl; x++) l.set(x, y, ROCK)
    const wr = 6 + 22 * Math.pow(Math.max(0, 1 - y / 72), 1.6) + 1.4 * noise(y * 0.5 + 9)
    for (let x = W - wr; x < W; x++) l.set(x, y, ROCK)
  }

  for (let x = 0; x < W; x++) {
    const top = groundTop(x)
    if (top === Infinity) continue
    for (let y = Math.round(top); y < H; y++) l.set(x, y, ROCK)
  }

  // Liseré clair sur les bords, taches sombres dedans, mousse sur les bords.
  const edge = new Layer()
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!l.get(x, y)) continue
      const bare = !l.get(x - 1, y) || !l.get(x + 1, y) || !l.get(x, y - 1) || !l.get(x, y + 1)
      if (bare) edge.set(x, y, RIM)
      else if (rnd() < 0.07) edge.set(x, y, ROCK_DARK)
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (edge.get(x, y)) l.set(x, y, edge.get(x, y))

  // Mousse : surtout sur le dessus de la rive, un peu le long des parois et sous le plafond.
  for (let x = 0; x < W; x++) {
    const top = groundTop(x)
    if (top === Infinity) continue
    const t = Math.round(top)
    l.set(x, t, '#3c8f48')
    l.set(x, t + 1, rnd() < 0.7 ? '#2d7a3c' : '#1f5c33')
    if (rnd() < 0.3) l.set(x, t - 1, MOSS[Math.floor(rnd() * 3)])
    if (rnd() < 0.08) l.set(x, t - 2, MOSS[2])
  }
  for (let y = 0; y < 76; y++) {
    for (let x = 0; x < W; x++) {
      if (!l.get(x, y) || l.get(x, y) === '#3c8f48') continue
      const touches = !l.get(x - 1, y) || !l.get(x + 1, y)
      if (touches && rnd() < 0.3) l.set(x, y, MOSS[Math.floor(rnd() * 3)])
    }
  }
  for (let x = 0; x < W; x += 5 + Math.floor(rnd() * 5)) {
    const y0 = ceil(x)
    const drip = 1 + Math.floor(rnd() * 3)
    for (let dy = 0; dy < drip; dy++) l.set(x, y0 + dy - 1, MOSS[dy % 3])
  }
  return l
}

// Les lianes pendent du plafond ; deux calques qui oscillent d'un pixel, en décalé.
function vines(rnd, parity) {
  const l = new Layer()
  const list = [
    [5, 26], [11, 18], [17, 30], [24, 12], [30, 20], [126, 14], [134, 22], [142, 30], [149, 18], [155, 26], [58, 9], [98, 11],
  ]
  list.forEach(([x0, len], i) => {
    if (i % 2 !== parity) return
    for (let dy = 0; dy < len; dy++) {
      const x = x0 + Math.round(Math.sin(dy * 0.4 + x0) * 1)
      l.set(x, dy + 2, dy % 5 === 4 ? '#56b85f' : '#2f8a43')
      if (dy % 4 === 3) l.set(x + (dy % 8 === 3 ? 1 : -1), dy + 2, '#56b85f')
    }
    l.set(x0, len + 2, '#7fd986')
  })
  return l
}

// Lucioles : un point clair, un halo pâle autour.
function fireflies() {
  const spots = [
    [22, 40], [28, 58], [12, 52], [36, 30], [140, 34], [148, 50], [120, 44], [132, 26],
    [96, 60], [64, 22], [50, 66], [86, 70], [110, 62], [40, 74],
  ]
  return spots
    .map(([x, y], i) => {
      const cls = `fly f${i % 4}`
      const delay = `animation-delay:${-(i * 1.7).toFixed(1)}s`
      return `<g class="${cls}" style="${delay}"><path fill="#d8f56a" opacity=".3" d="M${x - 1} ${y}h3v1h-3zM${x} ${y - 1}h1v3h-1z"/><path fill="#f3ff9a" d="M${x} ${y}h1v1h-1z"/></g>`
    })
    .join('')
}

// Ondulations du lac : de courts traits pâles à quelques rangées, qui glissent d'un pixel.
function ripples(rnd, seed) {
  const l = new Layer()
  const r = mulberry32(seed)
  for (const y of [85, 88, 91, 94, 97]) {
    for (let k = 0; k < 6; k++) {
      const x = 34 + Math.floor(r() * 70)
      const len = 3 + Math.floor(r() * 6)
      for (let i = 0; i < len; i++) l.set(x + i, y, y < 90 ? '#2f8a80' : '#1f6a68')
    }
  }
  return l
}

function lilyPads() {
  const l = new Layer()
  const pads = [[50, 86], [59, 89], [72, 86], [84, 91], [64, 94]]
  for (const [x, y] of pads) {
    for (let i = 0; i < 5; i++) l.set(x + i, y, '#2f7d3f')
    for (let i = 1; i < 4; i++) l.set(x + i, y - 1, '#4aa352')
  }
  l.set(73, 85, '#e8a0b8')
  l.set(74, 85, '#f5c6d4')
  return l
}

const KNIGHT = [
  '.k.........k...',
  '.kk.......kk...',
  '..kk.....kk....',
  '..kkwwwwwkk....',
  '.kwwwwwwwwwk...',
  '.kwkkwwwkkwk...',
  '.kwkkwwwkkwk...',
  '.kwwwwwwwwgk...',
  '..kwwwwwwgk....',
  '...kkkkkkk...n.',
  '..kkkkkkkkk..n.',
  '.kkkkkkkkkkk.n.',
  '.kkkkkkkkkkk.n.',
  '..kkkkkkkkk.ggg',
  '..kk.....kk.k..',
  '..kk.....kk....',
]
const KNIGHT_PALETTE = { k: '#121a22', w: '#e6efeb', g: '#a9b8b3', n: '#dbe5e1' }
const BENCH = [
  '..g.........g..',
  '.g.g.......g.g.',
  '.ggggggggggggg.',
  '.ghhhhhhhhhhhg.',
  '..g.........g..',
  '..g.........g..',
]
const BENCH_PALETTE = { g: '#5d6f78', h: '#8fa4ab' }

const STYLE = `
.v0{animation:sway 5s steps(1,end) infinite}
.v1{animation:sway 5s steps(1,end) infinite;animation-delay:-2.5s}
@keyframes sway{0%{transform:translateX(0)}50%{transform:translateX(1px)}}
.rip0{animation:slide 7s steps(1,end) infinite}
.rip1{animation:slide 9s steps(1,end) infinite;animation-delay:-3s}
@keyframes slide{0%{transform:translateX(0)}25%{transform:translateX(1px)}50%{transform:translateX(2px)}75%{transform:translateX(1px)}}
.fly{animation:bob 4s steps(1,end) infinite, blink 3s steps(1,end) infinite}
.f1{animation-duration:5s,2.3s}
.f2{animation-duration:6s,3.7s}
.f3{animation-duration:3.5s,2.9s}
@keyframes bob{0%{transform:translate(0,0)}25%{transform:translate(1px,-1px)}50%{transform:translate(1px,-2px)}75%{transform:translate(0,-1px)}}
@keyframes blink{0%{opacity:1}60%{opacity:.35}80%{opacity:1}}
.head{animation:breathe 3.2s steps(1,end) infinite}
@keyframes breathe{0%{transform:translateY(0)}50%{transform:translateY(1px)}}
.shaft{animation:shaft 8s steps(1,end) infinite}
@keyframes shaft{0%{opacity:.05}33%{opacity:.08}66%{opacity:.06}}
@media (prefers-reduced-motion: reduce){*{animation:none !important}}`

export function greenpathSvg() {
  const rnd = mulberry32(7)
  const bg = background()
  const far = farRocks(rnd)
  const rock = cave(rnd)
  const v0 = vines(rnd, 0)
  const v1 = vines(rnd, 1)
  const rip0 = ripples(rnd, 11)
  const rip1 = ripples(rnd, 23)
  const pads = lilyPads()

  const knight = sprite(KNIGHT, KNIGHT_PALETTE)
  const head = new Layer(15, 9)
  const body = new Layer(15, 16)
  for (let y = 0; y < 16; y++) for (let x = 0; x < 15; x++) (y < 9 ? head : body).set(x, y, knight.get(x, y))
  const knightRim = outlineOf(knight, '#3fb8a0')
  const bench = sprite(BENCH, BENCH_PALETTE)
  const benchRim = outlineOf(bench, '#2a6f66')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" ` +
    `preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges"><style>${STYLE}</style>` +
    `<g transform="scale(10)">` +
    bg.svg() +
    `<g opacity=".8">${far.svg()}</g>` +
    `<polygon class="shaft" points="18,0 34,0 52,84 30,84" fill="#cfffe0" opacity=".06"/>` +
    `<g class="rip0">${rip0.svg()}</g><g class="rip1">${rip1.svg()}</g>` +
    pads.svg() +
    rock.svg() +
    `<g transform="translate(116 66)" opacity=".5">${benchRim.svg()}</g>` +
    `<g transform="translate(116 66)">${bench.svg()}</g>` +
    `<g transform="translate(134 56)" opacity=".5">${knightRim.svg()}</g>` +
    `<g transform="translate(134 56)">${body.svg()}<g class="head">${head.svg()}</g></g>` +
    `<g class="v0">${v0.svg()}</g><g class="v1">${v1.svg()}</g>` +
    fireflies() +
    `</g></svg>`
  )
}
