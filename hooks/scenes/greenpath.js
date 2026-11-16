// Greenpath : une grotte brumeuse en pixel art, dans l'esprit des vrais décors du jeu :
// air bleu-vert, grands faisceaux de lumière, feuillage indigo qui pend du plafond, lac à la surface lumineuse,
// ponton en fer forgé, lampadaire à deux globes, banc, lucioles, et le petit chevalier à la grosse tête blanche.
// Dessin original (rien n'est copié des images du jeu), sur une grille de 320 x 200 pixels (1 pixel = 5 unités du SVG).
// Les animations avancent par paliers (steps) pour garder l'effet pixel.
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.

const W = 320
const H = 200
const WATER_Y = 166

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
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

// Une grille de pixels colorés qui sort en un <path> par couleur (traits horizontaux fusionnés, écriture relative).
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
        const entry = byColor.get(c) ?? { d: '', cx: 0, cy: 0 }
        const len = end - x + 1
        entry.d += `m${x - entry.cx} ${y - entry.cy}h${len}v1h-${len}z`
        entry.cx = x
        entry.cy = y
        byColor.set(c, entry)
        x = end + 1
      }
    }
    return [...byColor].map(([c, e]) => `<path fill="${c}" d="${e.d}"/>`).join('')
  }
}

function disc(layer, cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r + r * 0.6) layer.set(cx + dx, cy + dy, color)
    }
  }
}

// Un amas de feuillage : des disques qui se recouvrent, un éclat en haut à gauche, quelques points clairs.
function foliage(layer, rnd, region, box, count, rMin, rMax, tones, glints, dens = 1) {
  const pts = []
  for (let i = 0; i < count * 4 && pts.length < count; i++) {
    const x = box.x0 + rnd() * (box.x1 - box.x0)
    const y = box.y0 + rnd() * (box.y1 - box.y0)
    if (region(x, y)) pts.push([Math.round(x), Math.round(y), rMin + Math.floor(rnd() * (rMax - rMin + 1))])
  }
  pts.sort((a, b) => a[1] - b[1])
  for (const [x, y, r] of pts) {
    const tone = tones[Math.floor(rnd() * tones.length)]
    disc(layer, x, y, r, tone.base)
    for (let dy = -r; dy <= 0; dy++) {
      for (let dx = -r; dx <= 0; dx++) {
        if (dx * dx + dy * dy <= r * r && dx + dy < -r * 0.7 && rnd() < 0.55 * dens) layer.set(x + dx, y + dy, tone.light)
      }
    }
    if (rnd() < 0.5 * dens) layer.set(x + Math.floor(rnd() * r), y + Math.floor(rnd() * r), glints[Math.floor(rnd() * glints.length)])
  }
}

const BANDS = ['#04070f', '#07131f', '#0a2030', '#0e3342', '#144a54', '#1c6663']

// Des bandes de couleur, avec trois rangées de trame (25 %, 50 %, 75 %) entre deux bandes : léger en poids.
function bandsSvg(id, bands, y0, y1) {
  const per = (y1 - y0) / bands.length
  const tiles = [
    [4, [0]],
    [2, [0]],
    [4, [0, 1, 2]],
  ]
  let defs = ''
  let out = ''
  for (let i = 0; i < bands.length; i++) {
    const a = Math.round(y0 + i * per)
    const last = i === bands.length - 1
    const b = last ? y1 : Math.round(y0 + (i + 1) * per) - 3
    out += `<rect y="${a}" width="${W}" height="${b - a}" fill="${bands[i]}"/>`
    if (last) continue
    tiles.forEach(([width, xs], k) => {
      const y = b + k
      const pid = `${id}${i}${k}`
      defs += `<pattern id="${pid}" width="${width}" height="1" patternUnits="userSpaceOnUse">${xs.map((x) => `<rect x="${x}" width="1" height="1" fill="${bands[i + 1]}"/>`).join('')}</pattern>`
      out += `<rect y="${y}" width="${W}" height="1" fill="${bands[i]}"/><rect y="${y}" width="${W}" height="1" fill="url(#${pid})"/>`
    })
  }
  return `<defs>${defs}</defs>${out}`
}

// Silhouettes lointaines de grandes feuilles et de rochers ronds, perdues dans la brume.
function farShapes(rnd, color, light, y0, y1) {
  const l = new Layer()
  foliage(l, rnd, () => true, { x0: 0, x1: W, y0, y1 }, 55, 7, 15, [{ base: color, light: color }], [color])
  return l
}

const groundTop = (x) => {
  if (x >= 200) return 150
  if (x >= 140) return 150 + (200 - x) * 0.27
  if (x <= 8) return 160
  if (x <= 14) return 160 + (x - 8)
  return Infinity
}

const DARK = '#04090e'
const FOLIAGE = [
  { base: '#16204a', light: '#26357a' },
  { base: '#1a2a5c', light: '#2d4a8e' },
  { base: '#102a3a', light: '#1f5a66' },
  { base: '#143a40', light: '#2a7a70' },
]
const GLINTS = ['#4cc9a0', '#7be8c0', '#8f7be8', '#b7a8ff', '#e6ff9a']

// Les deux rives en silhouette sombre, couvertes de feuillage tacheté.
function ground(rnd) {
  const l = new Layer()
  for (let x = 0; x < W; x++) {
    const top = groundTop(x)
    if (top === Infinity) continue
    for (let y = Math.round(top); y < H; y++) l.set(x, y, DARK)
  }
  const onTop = (x, y) => {
    const t = groundTop(Math.round(x))
    return t !== Infinity && y < t + 3 && y > t - 8
  }
  foliage(l, rnd, onTop, { x0: 0, x1: W, y0: 140, y1: 170 }, 110, 1, 3, FOLIAGE, GLINTS, 0.6)
  return l
}

// Parois couvertes de feuillage, sur les bords gauche et droit et sous le plafond.
function walls(rnd) {
  const l = new Layer()
  const wl = (y) => 10 + 46 * Math.pow(Math.max(0, 1 - y / 150), 1.5) + 3 * noise(y * 0.3)
  const wr = (y) => 10 + 50 * Math.pow(Math.max(0, 1 - y / 150), 1.5) + 3 * noise(y * 0.3 + 7)
  const ceil = (x) => 10 + 8 * noise(x * 0.2) * 0.5 + 6
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < wl(y); x++) l.set(x, y, DARK)
    for (let x = W - wr(y); x < W; x++) l.set(x, y, DARK)
  }
  for (let x = 0; x < W; x++) for (let y = 0; y < ceil(x); y++) l.set(x, y, DARK)
  const inside = (x, y) => x < wl(y) + 2 || x > W - wr(y) - 2 || y < ceil(x) + 2
  foliage(l, rnd, inside, { x0: 0, x1: W, y0: 0, y1: 160 }, 230, 2, 5, FOLIAGE, GLINTS, 0.3)
  return l
}

const FALL = { x0: 64, x1: 78, top: 62 }

// Surplomb de roche d'où tombe la cascade, qui sort de la paroi gauche.
function ledge(rnd) {
  const l = new Layer()
  for (let x = 22; x <= FALL.x1 + 3; x++) {
    const thick = Math.max(4, Math.round(14 - (x - 22) / 6))
    for (let y = FALL.top - 3; y < FALL.top - 3 + thick; y++) l.set(x, y, DARK)
    l.set(x, FALL.top - 3, '#1c4d40')
  }
  const onTop = (x, y) => x >= 24 && x <= FALL.x1 + 2 && y < FALL.top && y > FALL.top - 8
  foliage(l, rnd, onTop, { x0: 22, x1: FALL.x1 + 3, y0: FALL.top - 8, y1: FALL.top }, 22, 1, 3, FOLIAGE, GLINTS, 0.6)
  return l
}

// Cascade : un ruban d'eau aux bords en escalier, des traînées claires qui descendent, de l'écume en bas.
function waterfall(rnd) {
  const { x0, x1, top } = FALL
  const bot = WATER_Y
  const jag = (y, k) => Math.round(Math.sin(y * 0.21 + k) * 1.2 + Math.sin(y * 0.07 + k * 3))
  const left = (y) => x0 + jag(y, 0)
  const right = (y) => x1 + jag(y, 5)
  const base = new Layer()
  for (let y = top; y < bot; y++) {
    for (let x = left(y); x <= right(y); x++) base.set(x, y, '#3aa8a2')
    base.set(left(y), y, '#1f7478')
    base.set(right(y), y, '#1f7478')
    const mid = Math.round((left(y) + right(y)) / 2) + (y % 40 < 20 ? 0 : 1)
    base.set(mid, y, '#6fd5c6')
    base.set(mid - 1, y, '#58c4b6')
  }
  const pts = []
  for (let y = top; y <= bot; y += 2) pts.push(`${left(y)},${y}`)
  for (let y = bot; y >= top; y -= 2) pts.push(`${right(y) + 1},${y}`)
  // Traînées : une tuile de 24 rangées qui se répète, déplacée par paliers pour donner la chute.
  const tile = new Layer(x1 - x0 + 8, 24)
  for (let k = 0; k < 9; k++) {
    const x = 1 + Math.floor(rnd() * (x1 - x0 + 4))
    const y = Math.floor(rnd() * 24)
    const len = 3 + Math.floor(rnd() * 5)
    const c = ['#d3fff4', '#8fe8d8', '#1f7478'][k % 3]
    for (let i = 0; i < len; i++) tile.set(x, (y + i) % 24, c)
  }
  const uses = []
  for (let y = top - 24; y < bot; y += 24) uses.push(`<use href="#wft" x="${x0 - 3}" y="${y}"/>`)
  // Écume au pied : deux images qui alternent, et un voile de brume.
  const foamA = new Layer()
  const foamB = new Layer()
  for (let x = x0 - 6; x <= x1 + 6; x++) {
    if ((x + 0) % 3) foamA.set(x, bot - 1, '#e9fff8')
    if ((x + 1) % 3) foamB.set(x, bot - 1, '#e9fff8')
    if (rnd() < 0.5) foamA.set(x, bot - 2, '#9ff7e2')
    if (rnd() < 0.5) foamB.set(x, bot - 3, '#9ff7e2')
  }
  return (
    base.svg() +
    `<defs><clipPath id="wfc"><polygon points="${pts.join(' ')}"/></clipPath><g id="wft">${tile.svg()}</g></defs>` +
    `<g clip-path="url(#wfc)"><g class="fall">${uses.join('')}</g></g>` +
    `<g class="foamA">${foamA.svg()}</g><g class="foamB">${foamB.svg()}</g>` +
    `<g class="mist" fill="#cffff6"><rect x="${x0 - 12}" y="${bot - 4}" width="${x1 - x0 + 24}" height="4" opacity=".1"/><rect x="${x0 - 8}" y="${bot - 8}" width="${x1 - x0 + 16}" height="4" opacity=".07"/><rect x="${x0 - 4}" y="${bot - 12}" width="${x1 - x0 + 8}" height="4" opacity=".04"/></g>`
  )
}

// Lianes de feuilles qui pendent du plafond ; deux calques qui oscillent d'un pixel, en décalé.
function strands(rnd, parity) {
  const l = new Layer()
  const list = [
    [14, 70], [28, 48], [40, 86], [54, 36], [68, 58], [96, 24], [150, 18], [196, 30], [228, 64], [246, 40],
    [262, 84], [278, 52], [292, 72], [306, 46], [20, 30], [120, 22],
  ]
  list.forEach(([x0, len], i) => {
    if (i % 2 !== parity) return
    const tones = FOLIAGE.slice(0, 2)
    for (let dy = 0; dy < len; dy += 2) {
      const r = dy < len * 0.7 ? 3 : dy < len * 0.9 ? 2 : 1
      const tone = tones[(dy >> 2) % 2]
      const x = x0 + Math.round(Math.sin(dy * 0.18 + x0) * 1.5)
      disc(l, x, 8 + dy, r, tone.base)
      l.set(x - 1, 7 + dy, tone.light)
      if (dy % 6 === 0) l.set(x + 1, 9 + dy, GLINTS[(dy / 6) % GLINTS.length | 0])
    }
  })
  return l
}

// Ponton en fer forgé qui part de la rive gauche au-dessus du lac.
function pier() {
  const l = new Layer()
  const iron = '#0b1822'
  const edge = '#2d5266'
  for (let x = 96; x <= 168; x++) {
    l.set(x, 160, edge)
    l.set(x, 161, iron)
    l.set(x, 162, iron)
    l.set(x, 153, x % 2 ? iron : edge)
  }
  for (let x = 102; x <= 168; x += 11) {
    for (let y = 154; y < 160; y++) l.set(x, y, iron)
    l.set(x, 152, edge)
    for (let y = 163; y < 176; y++) l.set(x, y, '#0a141c')
  }
  for (let x = 107; x <= 163; x += 11) {
    for (let k = 0; k < 4; k++) l.set(x + (k % 2), 154 + k, iron)
  }
  return l
}

// Surface lumineuse du lac et ondulations.
const WATER_BANDS = ['#0a3a40', '#08303a', '#062631', '#051c27', '#031320']

function surfaceLine(r) {
  const l = new Layer()
  for (let x = 14; x < 142; x++) {
    l.set(x, WATER_Y, r() < 0.12 ? '#e9fff8' : '#9ff7e2')
    l.set(x, WATER_Y - 1, '#3fb5a4')
    l.set(x, WATER_Y + 1, '#2f8f86')
  }
  return l
}

function ripples(seed) {
  const l = new Layer()
  const r = mulberry32(seed)
  for (const y of [170, 174, 178, 183, 189, 195]) {
    for (let k = 0; k < 7; k++) {
      const x = 14 + Math.floor(r() * 118)
      const len = 4 + Math.floor(r() * 9)
      for (let i = 0; i < len; i++) l.set(x + i, y, y < 180 ? '#2a8f8a' : '#1b6a6c')
    }
  }
  return l
}

// Lampadaire à deux globes, banc de fer, chevalier.
function lamp() {
  const l = new Layer(14, 60)
  const iron = '#0c1820'
  const light = '#3b6a80'
  for (let y = 4; y < 60; y++) {
    l.set(6, y, light)
    l.set(7, y, iron)
  }
  for (let x = 4; x <= 9; x++) l.set(x, 58, iron)
  l.set(4, 59, iron)
  l.set(9, 59, iron)
  return l
}

const BENCH = [
  '.gggggggggggggggggg.',
  '.g.g.g.g.g.g.g.g.g..',
  '.gg.gg.gg.gg.gg.gg..',
  '.g.g.g.g.g.g.g.g.g..',
  '.gggggggggggggggggg.',
  'hhhhhhhhhhhhhhhhhhhh',
  '.gg..............gg.',
  '.g................g.',
]

const KNIGHT = (() => {
  const l = new Layer(18, 24)
  const px = (x, y, c) => l.set(x, y, c)
  const W_ = '#f4f7f5'
  const S_ = '#bfcac8'
  const row = (y, x0, x1, c) => {
    for (let x = x0; x <= x1; x++) px(x, y, c)
  }
  const mirror = (x) => 17 - x
  // Cornes : longues, recourbées vers l'extérieur, la pointe revient vers l'intérieur.
  const horn = [
    [4, 5], [3, 5], [3, 4], [4, 4], [2, 3], [3, 3], [1, 3], [1, 2], [2, 2], [0, 1], [1, 1], [0, 0], [1, 0], [2, 0],
  ]
  for (const [x, y] of horn) {
    px(x, y, W_)
    px(mirror(x), y, W_)
  }
  // Tête : très grande, large, menton court.
  row(5, 5, 12, W_)
  row(6, 4, 13, W_)
  for (let y = 7; y <= 11; y++) row(y, 3, 14, W_)
  row(12, 4, 13, W_)
  row(13, 6, 11, S_)
  for (let y = 7; y <= 12; y++) px(y === 12 ? 13 : 14, y, S_)
  // Yeux ronds et noirs.
  const E_ = '#05070c'
  for (const x0 of [4, 10]) {
    row(8, x0 + 1, x0 + 2, E_)
    row(9, x0, x0 + 3, E_)
    row(10, x0, x0 + 3, E_)
    row(11, x0 + 1, x0 + 2, E_)
  }
  // Cape bleu-gris à rayures, jambes noires.
  row(14, 7, 10, '#222b49')
  row(15, 6, 11, '#222b49')
  for (let y = 16; y <= 20; y++) {
    row(y, 5, 12, '#222b49')
    for (let x = 6; x <= 11; x += 2) px(x, y, '#37436e')
  }
  row(21, 6, 11, '#1a2240')
  px(6, 22, '#05070c')
  px(7, 22, '#05070c')
  px(10, 22, '#05070c')
  px(11, 22, '#05070c')
  px(6, 23, '#05070c')
  px(7, 23, '#05070c')
  px(10, 23, '#05070c')
  px(11, 23, '#05070c')
  // Clou tenu sur le côté.
  const N_ = '#cfd9d6'
  for (const [x, y] of [[13, 15], [14, 16], [14, 17], [15, 18], [15, 19], [16, 20], [16, 21]]) px(x, y, N_)
  px(12, 15, '#05070c')
  return l
})()

function paletteSprite(lines, palette) {
  const l = new Layer(lines[0].length, lines.length)
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) if (palette[line[x]]) l.set(x, y, palette[line[x]])
  })
  return l
}

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

// Un globe lumineux : des disques emboîtés de plus en plus clairs.
function orb(cx, cy, r) {
  return (
    `<g opacity=".07">${circle(cx, cy, r * 4, '#a5fff0')}</g>` +
    `<g opacity=".1">${circle(cx, cy, r * 3, '#a5fff0')}</g>` +
    `<g opacity=".16">${circle(cx, cy, r * 2, '#c5fff6')}</g>` +
    circle(cx, cy, r, '#e9fffa')
  )
}
function circle(cx, cy, r, color) {
  const l = new Layer()
  disc(l, cx, cy, r, color)
  return l.svg()
}

function fireflies() {
  const spots = [
    [30, 70], [50, 110], [24, 140], [76, 50], [110, 96], [128, 70], [150, 120], [90, 130], [170, 60], [186, 100],
    [210, 80], [230, 118], [250, 70], [270, 100], [296, 90], [304, 130], [60, 30], [200, 30], [140, 28], [120, 146],
    [180, 140], [72, 150], [260, 40], [40, 48],
  ]
  return spots
    .map(([x, y], i) => {
      const delay = `animation-delay:${-(i * 1.3).toFixed(1)}s`
      return (
        `<g class="fly f${i % 4}" style="${delay}">` +
        `<path fill="#d8f56a" opacity=".3" d="M${x - 1} ${y}h3v1h-3zM${x} ${y - 1}h1v3h-1z"/>` +
        `<path fill="#f3ff9a" d="M${x} ${y}h1v1h-1z"/></g>`
      )
    })
    .join('')
}

const STYLE = `
.v0{animation:sway 6s steps(1,end) infinite}
.v1{animation:sway 6s steps(1,end) infinite;animation-delay:-3s}
@keyframes sway{0%{transform:translateX(0)}50%{transform:translateX(1px)}}
.rip0{animation:slide 7s steps(1,end) infinite}
.rip1{animation:slide 9s steps(1,end) infinite;animation-delay:-3s}
@keyframes slide{0%{transform:translateX(0)}25%{transform:translateX(1px)}50%{transform:translateX(2px)}75%{transform:translateX(1px)}}
.glow{animation:glow 2.6s steps(1,end) infinite}
@keyframes glow{0%{opacity:1}50%{opacity:.78}}
.fly{animation:bob 4s steps(1,end) infinite, blink 3s steps(1,end) infinite}
.f1{animation-duration:5s,2.3s}
.f2{animation-duration:6s,3.7s}
.f3{animation-duration:3.5s,2.9s}
@keyframes bob{0%{transform:translate(0,0)}25%{transform:translate(1px,-1px)}50%{transform:translate(1px,-2px)}75%{transform:translate(0,-1px)}}
@keyframes blink{0%{opacity:1}60%{opacity:.35}80%{opacity:1}}
.head{animation:breathe 3.2s steps(1,end) infinite}
@keyframes breathe{0%{transform:translateY(0)}50%{transform:translateY(1px)}}
.shaft{animation:shaft 9s steps(1,end) infinite}
.shaft.b{animation-delay:-3s}
.shaft.c{animation-delay:-6s}
@keyframes shaft{0%{opacity:1}33%{opacity:.6}66%{opacity:.82}}
.fall{animation:fall 1.2s steps(6,end) infinite}
@keyframes fall{from{transform:translateY(0)}to{transform:translateY(24px)}}
.foamA{animation:flipA 0.8s steps(1,end) infinite}
.foamB{animation:flipB 0.8s steps(1,end) infinite}
@keyframes flipA{0%{opacity:1}50%{opacity:0}}
@keyframes flipB{0%{opacity:0}50%{opacity:1}}
.mist{animation:mist 3s steps(1,end) infinite}
@keyframes mist{0%{opacity:1}50%{opacity:.6}}
.shine{animation:shine 3s steps(1,end) infinite}
@keyframes shine{0%{opacity:1}50%{opacity:.7}}
@media (prefers-reduced-motion: reduce){*{animation:none !important}}`

export function greenpathSvg() {
  const rnd = mulberry32(11)
  const bg = bandsSvg('s', BANDS, 0, WATER_Y)
  const far1 = farShapes(rnd, '#0b2234', '#123a4c', 40, 150)
  const far2 = farShapes(rnd, '#0a2c3c', '#17505a', 70, 160)
  const water = bandsSvg('w', WATER_BANDS, WATER_Y, H)
  const line = surfaceLine(mulberry32(5))
  const rip0 = ripples(11)
  const rip1 = ripples(23)
  const pierL = pier()
  const land = ground(rnd)
  const wall = walls(rnd)
  const s0 = strands(rnd, 0)
  const s1 = strands(rnd, 1)
  const lip = ledge(rnd)
  const fall = waterfall(rnd)

  const head = new Layer(18, 14)
  const body = new Layer(18, 24)
  for (let y = 0; y < 24; y++) for (let x = 0; x < 18; x++) (y < 14 ? head : body).set(x, y, KNIGHT.get(x, y))
  const knightRim = outlineOf(KNIGHT, '#5fd0be')
  const bench = paletteSprite(BENCH, { g: '#17323f', h: '#3f7388' })
  const benchRim = outlineOf(bench, '#3f7f8f')
  const lampPost = lamp()

  const LX = 236

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" ` +
    `preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges"><style>${STYLE}</style>` +
    `<g transform="scale(5)">` +
    bg +
    `<g opacity=".55">${far1.svg()}</g><g opacity=".5">${far2.svg()}</g>` +
    // Grands faisceaux de lumière, en bandes douces.
    `<g class="shaft"><polygon points="70,0 110,0 170,166 120,166" fill="#bff8ee" opacity=".06"/></g>` +
    `<g class="shaft b"><polygon points="130,0 160,0 215,166 175,166" fill="#bff8ee" opacity=".05"/></g>` +
    `<g class="shaft c"><polygon points="20,0 50,0 90,166 60,166" fill="#bff8ee" opacity=".05"/></g>` +
    // Brume par bandes, de plus en plus dense près de l'eau.
    `<rect y="110" width="320" height="14" fill="#2aa8a0" opacity=".05"/><rect y="124" width="320" height="14" fill="#2aa8a0" opacity=".06"/>` +
    `<rect y="138" width="320" height="14" fill="#38c4b4" opacity=".08"/><rect y="152" width="320" height="14" fill="#52e0cc" opacity=".1"/>` +
    water +
    `<g class="rip0">${rip0.svg()}</g><g class="rip1">${rip1.svg()}</g>` +
    `<g class="shine">${line.svg()}</g>` +
    pierL.svg() +
    land.svg() +
    // Lampadaire, banc, chevalier sur la rive droite.
    `<g transform="translate(${LX} 90)">${lampPost.svg()}</g>` +
    `<g class="glow">${orb(LX + 7, 102, 4)}${orb(LX + 7, 92, 2)}</g>` +
    `<g transform="translate(250 142)" opacity=".6">${benchRim.svg()}</g>` +
    `<g transform="translate(250 142)">${bench.svg()}</g>` +
    `<g transform="translate(276 126)" opacity=".55">${knightRim.svg()}</g>` +
    `<g transform="translate(276 126)">${body.svg()}<g class="head">${head.svg()}</g></g>` +
    wall.svg() +
    lip.svg() +
    fall +
    `<g class="v0">${s0.svg()}</g><g class="v1">${s1.svg()}</g>` +
    fireflies() +
    `</g></svg>`
  )
}
