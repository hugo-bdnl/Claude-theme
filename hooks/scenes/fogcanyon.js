// Fog Canyon : un canyon de brume lilas et bleue, dans l'esprit des vrais décors du jeu :
// air clair violacé, gros rochers noirs couverts de mousse violette qui brille, bulbes pêche, herbes sombres,
// grandes bulles translucides, et des méduses blanches au cœur orange qui montent dans l'écran,
// chacune à son rythme, de façon irrégulière.
// Dessin original (rien n'est copié des images du jeu), sur une grille de 320 x 200 pixels (1 pixel = 5 unités du SVG).
// Les animations avancent par paliers (steps) pour garder l'effet pixel.
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.

import { W, H, Layer, disc, mulberry32, bandsSvg, outlineOf, knightLayer } from './pixel.js'

const BANDS = ['#1c2160', '#262c78', '#323688', '#403f9a', '#5148aa', '#6652b4']
const CORE = '#0a0720'
const MOSS = [
  { base: '#26206a', light: '#3a2f9a' },
  { base: '#2f2880', light: '#4a3cb0' },
  { base: '#1e4a6a', light: '#2f7a8a' },
  { base: '#2a3a7a', light: '#4a6ab0' },
]
const SPARKS = ['#e6d9ff', '#bfe8ff', '#ffd6ec']

// Un rocher sombre couvert de mousse : un cœur noir fait de disques, une bordure de feuilles violettes
// avec des points brillants, des herbes sombres et des bulbes pêche sur le dessus, des racines qui pendent dessous.
function island(rnd, discs, opts) {
  const core = new Layer()
  for (const [cx, cy, r] of discs) disc(core, cx, cy, r, CORE)
  const moss = new Layer()
  const near = (x, y, d) => {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (!core.get(x + dx, y + dy)) return true
    return false
  }
  const spots = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (core.get(x, y) && near(x, y, 2)) spots.push([x, y])
  const pick = []
  for (let i = 0; i < opts.moss && spots.length; i++) pick.push(spots.splice(Math.floor(rnd() * spots.length), 1)[0])
  pick.sort((a, b) => a[1] - b[1])
  for (const [x, y] of pick) {
    const tone = MOSS[Math.floor(rnd() * MOSS.length)]
    const r = 1 + Math.floor(rnd() * 3)
    disc(moss, x, y, r, tone.base)
    if (rnd() < 0.6) moss.set(x - 1, y - 1, tone.light)
    if (rnd() < 0.35) moss.set(x + Math.floor(rnd() * 3) - 1, y + Math.floor(rnd() * 3) - 1, SPARKS[Math.floor(rnd() * SPARKS.length)])
  }
  const tops = []
  const under = []
  for (let y = 4; y < H - 2; y++) {
    for (let x = 0; x < W; x++) {
      if (!core.get(x, y)) continue
      if (!core.get(x, y - 1)) tops.push([x, y])
      if (!core.get(x, y + 1) && y < H - 8) under.push([x, y])
    }
  }
  const extras = new Layer()
  for (let i = 0; i < opts.grass && tops.length; i++) {
    const [x, y] = tops.splice(Math.floor(rnd() * tops.length), 1)[0]
    const h = 6 + Math.floor(rnd() * 9)
    const lean = rnd() < 0.5 ? -1 : 1
    for (let dy = 1; dy <= h; dy++) extras.set(x + Math.round((dy / h) * (dy / h) * 2 * lean), y - dy, '#16143e')
  }
  for (let i = 0; i < opts.bulbs && tops.length; i++) {
    const [x, y] = tops.splice(Math.floor(rnd() * tops.length), 1)[0]
    const r = 2 + Math.floor(rnd() * 3)
    disc(extras, x, y - r, r, '#e8a8b0')
    for (let dy = 0; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r && dx + dy > r * 0.5) extras.set(x + dx, y - r + dy, '#c47898')
    extras.set(x - 1, y - r * 2 + 1, '#fff0ee')
    extras.set(x - r + 1, y - r - 1, '#fff0ee')
  }
  for (let i = 0; i < opts.drips && under.length; i++) {
    const [x, y] = under.splice(Math.floor(rnd() * under.length), 1)[0]
    const len = 4 + Math.floor(rnd() * 12)
    for (let dy = 1; dy <= len; dy++) extras.set(x + (dy > len * 0.6 ? 1 : 0), y + dy, '#0d0a26')
  }
  return { core, svg: () => core.svg() + moss.svg() + extras.svg() }
}

// Gros tronc bleuté derrière le rocher de droite.
function trunk(rnd) {
  const l = new Layer()
  for (let y = 100; y < H; y++) for (let x = 282; x < 304 + Math.round(Math.sin(y * 0.2) * 1.5); x++) l.set(x, y, '#2d2c78')
  for (let i = 0; i < 40; i++) {
    const x = 284 + Math.floor(rnd() * 18)
    const y = 104 + Math.floor(rnd() * 92)
    for (let dy = 0; dy < 4 + Math.floor(rnd() * 8); dy++) l.set(x, y + dy, '#3b3a92')
  }
  return l
}

// Deux bornes de pierre en bas à droite.
function posts() {
  const l = new Layer()
  for (const [x, top] of [[250, 176], [272, 182]]) {
    for (let y = top; y < H; y++) for (let dx = 0; dx < 5; dx++) l.set(x + dx, y, '#24235c')
    for (let dx = -1; dx < 6; dx++) l.set(x + dx, top, '#3b3a92')
    for (let y = top + 1; y < H; y++) l.set(x, y, '#2f2e78')
  }
  return l
}

// Brume rosée en bas, amas lilas pâles qui dérivent.
function glow(rnd, color, count, x0, x1, y0, y1, r0, r1) {
  const l = new Layer()
  for (let i = 0; i < count; i++) disc(l, Math.round(x0 + rnd() * (x1 - x0)), Math.round(y0 + rnd() * (y1 - y0)), r0 + Math.floor(rnd() * (r1 - r0 + 1)), color)
  return l
}

// Boule de pissenlit rose, au repos au milieu.
function puffball() {
  const l = new Layer(25, 25)
  disc(l, 12, 12, 6, '#f0bcd8')
  disc(l, 11, 11, 3, '#f8d8ea')
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2
    for (let d = 7; d <= 11; d++) l.set(12 + Math.cos(a) * d, 12 + Math.sin(a) * d, d >= 10 ? '#fff0f8' : '#e8a8cc')
  }
  return l
}

// Les méduses : trois tailles, deux images chacune (cloche large et bras longs / cloche serrée et bras courts).
// Cloche blanche lilas, cœur chaud orange-jaune, longs bras fins dont le bout s'enroule vers l'extérieur.
const JELLY_TYPES = {
  L: { w: 26, h: 20, arms: 8, len: 34, halo: 24, warm: false },
  M: { w: 16, h: 12, arms: 6, len: 18, halo: 15, warm: false },
  S: { w: 10, h: 8, arms: 4, len: 10, halo: 10, warm: true },
}

function jellyDefs() {
  let defs = ''
  for (const [key, c] of Object.entries(JELLY_TYPES)) {
    const lw = c.w + 14
    const lh = c.h + c.len + 6
    const cx = (lw - 1) / 2
    const fill = c.warm ? '#ffe6f0' : '#f7f0ff'
    const rimC = c.warm ? '#f0b4d0' : '#d4c4f2'
    for (const frame of ['a', 'b']) {
      const w = frame === 'a' ? c.w : c.w - 2
      const h = frame === 'a' ? c.h : c.h + 1
      const len = frame === 'a' ? c.len : Math.round(c.len * 0.75)
      const l = new Layer(lw, lh)
      const mid = h * 0.6
      for (let y = 0; y < h; y++) {
        const t = y <= mid ? (mid - y) / (mid + 0.6) : 0
        const half = (w / 2) * Math.sqrt(Math.max(0, 1 - t * t)) * (y > mid ? 1 - ((y - mid) / h) * 0.2 : 1)
        const x0 = Math.round(cx - half)
        const x1 = Math.round(cx + half)
        for (let x = x0; x <= x1; x++) l.set(x, y, x === x0 || x === x1 || y === 0 || y === h - 1 ? rimC : fill)
      }
      for (let y = 1; y < h - 1; y++) {
        for (let x = 0; x < lw; x++) {
          const dx = (x - cx) / (w * 0.24)
          const dy = (y - h * 0.5) / (h * 0.26)
          const d = dx * dx + dy * dy
          if (d <= 1 && l.get(x, y) === fill) l.set(x, y, d < 0.35 ? '#fff4b0' : '#ffc268')
        }
      }
      l.set(Math.round(cx), Math.round(h * 0.5), '#ffffff')
      for (let i = 0; i <= Math.max(1, Math.round(w / 7)); i++) l.set(Math.round(cx - w / 2) + 2 + i, 1, '#ffffff')
      l.set(Math.round(cx - w / 2) + 1, 2, '#ffffff')
      const arms = c.arms
      const span = w * 0.62
      for (let i = 0; i < arms; i++) {
        const xa = cx - span / 2 + i * (span / Math.max(1, arms - 1))
        const li = Math.max(3, Math.round(len * (0.62 + (0.38 * ((i * 5) % 3)) / 2)))
        const sign = xa < cx ? -1 : 1
        const mag = Math.abs(xa - cx) / (span / 2)
        for (let dy = 1; dy <= li; dy++) {
          const curl = dy > li * 0.6 ? Math.round((dy - li * 0.6) * 0.55 * sign * (0.5 + mag)) : 0
          const x = xa + Math.round(Math.sin((dy + (frame === 'a' ? 0 : 3)) * 0.5 + i * 1.3) * 1) + curl
          l.set(x, h - 1 + dy, dy > li - 3 ? '#ffffff' : c.warm ? '#ffd0e4' : '#ece0ff')
        }
      }
      defs += `<g id="j${key}${frame}">${l.svg()}</g>`
    }
    const hs = (r, op) => {
      const hl = new Layer(c.halo * 2 + 1, c.halo * 2 + 1)
      disc(hl, c.halo, c.halo, r, '#d8c8ff')
      return `<g opacity="${op}">${hl.svg()}</g>`
    }
    defs += `<g id="j${key}h" transform="translate(${cx - c.halo} ${c.h / 2 - c.halo})">${hs(c.halo, 0.05)}${hs(Math.round(c.halo * 0.7), 0.08)}${hs(Math.round(c.halo * 0.45), 0.12)}</g>`
  }
  return defs
}

// Bulles translucides : un disque pâle, un anneau plus clair, un reflet. Trois tailles, bleues ou roses.
function bubbleDefs() {
  let defs = ''
  for (const [name, r, fill, ring] of [['b4', 4, '#8cc4e4', '#cbeaf8'], ['b7', 7, '#8cc4e4', '#cbeaf8'], ['b11', 11, '#7ab0d8', '#bfe2f6'], ['p6', 6, '#e8a8d8', '#fbd8f0']]) {
    const body = new Layer(r * 2 + 1, r * 2 + 1)
    const edge = new Layer(r * 2 + 1, r * 2 + 1)
    for (let y = 0; y <= r * 2; y++) {
      for (let x = 0; x <= r * 2; x++) {
        const d = Math.hypot(x - r, y - r)
        if (d <= r + 0.3) body.set(x, y, fill)
        if (d <= r + 0.3 && d >= r - 1.1) edge.set(x, y, ring)
      }
    }
    const shine = new Layer(r * 2 + 1, r * 2 + 1)
    for (let i = 0; i < Math.max(2, Math.round(r / 2)); i++) shine.set(Math.round(r * 0.5) + i, Math.round(r * 0.45), '#ffffff')
    shine.set(Math.round(r * 0.5), Math.round(r * 0.45) + 1, '#ffffff')
    defs += `<g id="${name}"><g opacity=".3">${body.svg()}</g><g opacity=".7">${edge.svg()}</g>${shine.svg()}</g>`
  }
  return defs
}

// Une méduse qui monte : trois mouvements emboîtés (montée lente, dérive de côté, battement irrégulier),
// chacun avec sa propre durée, donc jamais deux méduses au même pas.
function jelly(rnd, type, x) {
  const pulse = (2.6 + rnd() * 2.4).toFixed(2)
  const lag = -(rnd() * 60).toFixed(1)
  const dur = type === 'L' ? 55 + rnd() * 20 : type === 'M' ? 65 + rnd() * 20 : 75 + rnd() * 20
  const sway = `sw${1 + Math.floor(rnd() * 3)}`
  const swayDur = (7 + rnd() * 8).toFixed(1)
  const swayLag = -(rnd() * 12).toFixed(1)
  const p = `animation-duration:${pulse}s;animation-delay:${lag}s`
  return (
    `<g transform="translate(${Math.round(x)} 214)"><g class="rise" style="animation-duration:${dur.toFixed(1)}s;animation-delay:${lag}s">` +
    `<g class="${sway}" style="animation-duration:${swayDur}s;animation-delay:${swayLag}s">` +
    `<use href="#j${type}h"/><g class="pulse" style="${p}">` +
    `<use href="#j${type}a" class="fa" style="${p}"/><use href="#j${type}b" class="fb" style="${p}"/>` +
    `</g></g></g></g>`
  )
}

function bubble(rnd, name, x) {
  const dur = (60 + rnd() * 50).toFixed(1)
  const lag = -(rnd() * 100).toFixed(1)
  const sway = `sw${1 + Math.floor(rnd() * 3)}`
  const swayDur = (8 + rnd() * 9).toFixed(1)
  return (
    `<g transform="translate(${Math.round(x)} 214)"><g class="rise" style="animation-duration:${dur}s;animation-delay:${lag}s">` +
    `<g class="${sway}" style="animation-duration:${swayDur}s"><use href="#${name}"/></g></g></g>`
  )
}

function sparkles(rnd) {
  let out = ''
  for (let i = 0; i < 34; i++) {
    const x = Math.round(rnd() * W)
    const y = Math.round(rnd() * (H - 20))
    out += `<path class="tw t${i % 3}" style="animation-delay:-${(rnd() * 6).toFixed(1)}s" fill="${SPARKS[i % 3]}" d="M${x} ${y}h1v1h-1z"/>`
  }
  return out
}

const STYLE = `
.rise{animation:rise 60s steps(165,end) infinite}
@keyframes rise{from{transform:translateY(0)}to{transform:translateY(-330px)}}
.sw1{animation:sw1 9s steps(1,end) infinite}
.sw2{animation:sw2 11s steps(1,end) infinite}
.sw3{animation:sw3 13s steps(1,end) infinite}
@keyframes sw1{0%{transform:translateX(0)}20%{transform:translateX(2px)}45%{transform:translateX(5px)}60%{transform:translateX(4px)}80%{transform:translateX(1px)}}
@keyframes sw2{0%{transform:translateX(0)}15%{transform:translateX(-2px)}40%{transform:translateX(-4px)}70%{transform:translateX(-6px)}85%{transform:translateX(-3px)}}
@keyframes sw3{0%{transform:translateX(0)}30%{transform:translateX(3px)}50%{transform:translateX(1px)}75%{transform:translateX(-2px)}90%{transform:translateX(-1px)}}
.pulse{animation:pulse 3s steps(1,end) infinite}
@keyframes pulse{0%{transform:translateY(0)}8%{transform:translateY(-1px)}16%{transform:translateY(-3px)}24%{transform:translateY(-4px)}34%{transform:translateY(-5px)}58%{transform:translateY(-4px)}78%{transform:translateY(-3px)}92%{transform:translateY(-1px)}}
.fa{animation:flipA 3s steps(1,end) infinite}
.fb{animation:flipB 3s steps(1,end) infinite}
@keyframes flipA{0%{opacity:0}34%{opacity:1}}
@keyframes flipB{0%{opacity:1}34%{opacity:0}}
.fogA{animation:fogA 40s steps(10,end) infinite alternate}
.fogB{animation:fogB 55s steps(12,end) infinite alternate}
@keyframes fogA{from{transform:translateX(0)}to{transform:translateX(10px)}}
@keyframes fogB{from{transform:translateX(0)}to{transform:translateX(-12px)}}
.shaft{animation:shaft 9s steps(1,end) infinite}
.shaft.b{animation-delay:-3s}
.shaft.c{animation-delay:-6s}
@keyframes shaft{0%{opacity:1}33%{opacity:.6}66%{opacity:.82}}
.tw{animation:tw 3s steps(1,end) infinite}
.t1{animation-duration:4.3s}
.t2{animation-duration:2.6s}
@keyframes tw{0%{opacity:1}45%{opacity:.25}70%{opacity:1}}
.puff{animation:puff 12s steps(1,end) infinite}
@keyframes puff{0%{transform:translate(0,0)}25%{transform:translate(1px,-1px)}50%{transform:translate(2px,0)}75%{transform:translate(1px,1px)}}
.head{animation:breathe 3.2s steps(1,end) infinite}
@keyframes breathe{0%{transform:translateY(0)}50%{transform:translateY(1px)}}
@media (prefers-reduced-motion: reduce){*{animation:none !important}}`

export function fogCanyonSvg() {
  const rnd = mulberry32(31)
  const left = island(rnd, [[34, 40, 40], [66, 30, 30], [90, 20, 18], [14, 90, 34], [40, 76, 26], [70, 64, 18], [12, 140, 30], [20, 176, 34], [44, 188, 22]],
    { moss: 520, grass: 8, bulbs: 5, drips: 7 })
  const right = island(rnd, [[292, 66, 26], [312, 78, 22], [268, 62, 14], [304, 54, 18], [284, 82, 14]],
    { moss: 210, grass: 4, bulbs: 3, drips: 3 })
  const mound = island(rnd, [[150, 192, 36], [118, 198, 28], [182, 198, 30], [150, 176, 20], [134, 184, 18]],
    { moss: 240, grass: 8, bulbs: 6, drips: 0 })
  const bark = trunk(rnd)
  const postLayer = posts()
  const haze = glow(rnd, '#e08ad8', 14, 160, 320, 150, 200, 8, 16)
  const mist = glow(rnd, '#a89cf0', 22, 0, W, 60, 170, 8, 15)
  const mistB = glow(rnd, '#a89cf0', 22, 0, W, 90, 190, 8, 15)
  const puff = puffball()

  const knight = knightLayer()
  const head = new Layer(18, 14)
  const body = new Layer(18, 24)
  for (let y = 0; y < 24; y++) for (let x = 0; x < 18; x++) (y < 14 ? head : body).set(x, y, knight.get(x, y))
  const knightRim = outlineOf(knight, '#c8bcff')

  const smalls = [100, 160, 200, 232, 118, 230].map((x) => jelly(rnd, 'S', x + rnd() * 20)).join('')
  const mediums = [76, 128, 196, 250].map((x) => jelly(rnd, 'M', x + rnd() * 16)).join('')
  const larges = [96, 190].map((x) => jelly(rnd, 'L', x + rnd() * 12)).join('')
  const smallBubbles = Array.from({ length: 8 }, (_, i) => bubble(rnd, i % 4 === 3 ? 'p6' : 'b4', 8 + rnd() * 300)).join('')
  const bigBubbles = [bubble(rnd, 'b11', 6), bubble(rnd, 'b11', 232), bubble(rnd, 'b7', 24), bubble(rnd, 'b7', 150), bubble(rnd, 'b7', 270), bubble(rnd, 'p6', 90)].join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" ` +
    `preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges"><style>${STYLE}</style>` +
    `<defs>${jellyDefs()}${bubbleDefs()}</defs><g transform="scale(5)">` +
    bandsSvg('f', BANDS, 0, H) +
    `<g opacity=".1">${haze.svg()}</g>` +
    `<g class="shaft"><polygon points="104,0 150,0 220,190 160,190" fill="#d8ccff" opacity=".07"/></g>` +
    `<g class="shaft b"><polygon points="196,0 224,0 270,190 236,190" fill="#d8ccff" opacity=".05"/></g>` +
    `<g class="shaft c"><polygon points="50,0 78,0 120,190 88,190" fill="#d8ccff" opacity=".05"/></g>` +
    bark.svg() +
    `<g class="fogA" opacity=".06">${mist.svg()}</g>` +
    smalls +
    smallBubbles +
    right.svg() +
    mediums +
    `<g class="puff" transform="translate(228 96)">${puff.svg()}</g>` +
    left.svg() +
    `<g class="fogB" opacity=".06">${mistB.svg()}</g>` +
    larges +
    mound.svg() +
    postLayer.svg() +
    `<g transform="translate(142 134)" opacity=".5">${knightRim.svg()}</g>` +
    `<g transform="translate(142 134)">${body.svg()}<g class="head">${head.svg()}</g></g>` +
    bigBubbles +
    sparkles(rnd) +
    `</g></svg>`
  )
}
