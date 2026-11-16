// Fog Canyon : un canyon de brume indigo et violette, dans l'esprit des vrais décors du jeu :
// falaises sombres en étages, plantes à bulbes roses sur les corniches, grands faisceaux de lumière,
// brume qui dérive, et des méduses lumineuses qui montent dans l'écran, chacune à son rythme, de façon irrégulière.
// Dessin original (rien n'est copié des images du jeu), sur une grille de 320 x 200 pixels (1 pixel = 5 unités du SVG).
// Les animations avancent par paliers (steps) pour garder l'effet pixel.
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.

import { W, H, Layer, disc, mulberry32, noise, bandsSvg, outlineOf, knightLayer } from './pixel.js'

const BANDS = ['#06051a', '#0b0a2c', '#12104a', '#1b1a6a', '#262590', '#3330a8']

// Une falaise sur chaque bord : bord irrégulier, corniches qui avancent. Dessinée en formes pleines à contour en escalier
// (un liseré clair d'un pixel dessous, le corps par-dessus), donc très légère.
function cliff(spec) {
  const shelf = (y, list) => {
    let extra = 0
    for (const [ys, len] of list) if (y >= ys && y < ys + 9) extra += len * (1 - (y - ys) / 14)
    return extra
  }
  const edgeL = (y) => Math.round(spec.w0 + spec.amp * noise(y * 0.11 + spec.seed) + shelf(y, spec.shelvesL))
  const edgeR = (y) => Math.round(spec.w1 + spec.amp * noise(y * 0.11 + spec.seed + 9) + shelf(y, spec.shelvesR))
  const ceil = (x) => Math.round(3 + 2 * noise(x * 0.1 + spec.seed) + 2)
  const stairs = (offset) => {
    let left = 'M0 0'
    let right = `M${W} 0`
    for (let y = 0; y < H; y++) {
      left += `H${edgeL(y) + offset}V${y + 1}`
      right += `H${W - edgeR(y) - offset}V${y + 1}`
    }
    let d = `${left}H0z${right}H${W}z`
    if (spec.ceiling) {
      let top = 'M0 0'
      for (let x = 0; x < W; x++) top += `V${ceil(x) + offset}H${x + 1}`
      d += `${top}V0z`
    }
    return d
  }
  return {
    svg: () => `<path fill="${spec.rim}" d="${stairs(1)}"/><path fill="${spec.color}" d="${stairs(0)}"/>`,
    has: (x, y) => x < edgeL(y) || x >= W - edgeR(y) || (spec.ceiling === true && y < ceil(x)),
  }
}

// Sol du canyon, au fond.
function floorLayer(rnd, color, rim) {
  const l = new Layer()
  for (let x = 0; x < W; x++) {
    const top = 188 + Math.round(noise(x * 0.2) * 1.2)
    for (let y = top; y < H; y++) l.set(x, y, color)
    l.set(x, top, rim)
  }
  return l
}

const BULBS = ['#ff8fb4', '#ff9a5a', '#ffb0d0']

// Plantes à bulbes roses ou orange sur les surfaces plates des falaises et du sol.
function plants(rnd, has, count, stalk) {
  const l = new Layer()
  const spots = []
  for (let x = 0; x < W; x++) for (let y = 8; y < H - 1; y++) if (has(x, y) && !has(x, y - 1)) spots.push([x, y])
  for (let i = 0; i < count && spots.length; i++) {
    const [x, y] = spots.splice(Math.floor(rnd() * spots.length), 1)[0]
    const h = 2 + Math.floor(rnd() * 5)
    for (let dy = 1; dy <= h; dy++) l.set(x + (dy > 3 ? 1 : 0), y - dy, stalk)
    const bx = x + (h > 3 ? 1 : 0)
    const r = 1 + Math.floor(rnd() * 2)
    disc(l, bx, y - h - 1, r, BULBS[Math.floor(rnd() * BULBS.length)])
    l.set(bx - 1, y - h - 2, '#ffe0ea')
  }
  return l
}

// Racines qui pendent du plafond, avec un bourgeon rose au bout ; deux calques qui oscillent d'un pixel.
function roots(rnd, parity) {
  const l = new Layer()
  const list = [[10, 52], [34, 30], [60, 66], [92, 24], [128, 40], [170, 20], [210, 34], [246, 58], [276, 28], [300, 62], [22, 22], [150, 14]]
  list.forEach(([x0, len], i) => {
    if (i % 2 !== parity) return
    for (let dy = 0; dy < len; dy++) {
      const x = x0 + Math.round(Math.sin(dy * 0.15 + x0) * 1.5)
      l.set(x, dy, '#1c1a58')
      if (dy % 5 === 2) l.set(x + 1, dy, '#2d2b86')
    }
    const x = x0 + Math.round(Math.sin(len * 0.15 + x0) * 1.5)
    disc(l, x, len + 1, 1, '#ff8fb4')
    l.set(x, len, '#ffe0ea')
  })
  return l
}

// Brume : de grands amas pâles qui dérivent d'un côté puis de l'autre.
function fogLayer(rnd, y0, y1, count) {
  const l = new Layer()
  for (let i = 0; i < count; i++) disc(l, Math.round(rnd() * W), Math.round(y0 + rnd() * (y1 - y0)), 6 + Math.floor(rnd() * 7), '#9a90ff')
  return l
}

// Les méduses : trois tailles, deux images chacune (dôme large et bras longs / dôme serré et bras courts).
const JELLY_TYPES = {
  L: { w: 23, h: 12, arms: 7, len: 20, halo: 18 },
  M: { w: 15, h: 8, arms: 5, len: 12, halo: 12 },
  S: { w: 9, h: 5, arms: 3, len: 7, halo: 8 },
}

function jellyDefs() {
  let defs = ''
  for (const [key, c] of Object.entries(JELLY_TYPES)) {
    const lw = c.w + 4
    const lh = c.h + c.len + 4
    const cx = (lw - 1) / 2
    for (const frame of ['a', 'b']) {
      const w = frame === 'a' ? c.w : c.w - 2
      const h = frame === 'a' ? c.h : c.h + 1
      const len = frame === 'a' ? c.len : Math.round(c.len * 0.7)
      const l = new Layer(lw, lh)
      for (let y = 0; y < h; y++) {
        const t = (h - 1 - y) / h
        const half = (w / 2) * Math.sqrt(1 - t * t)
        const x0 = Math.round(cx - half)
        const x1 = Math.round(cx + half)
        for (let x = x0; x <= x1; x++) l.set(x, y, x === x0 || x === x1 || y === 0 ? '#9a86ee' : y === h - 1 ? '#b9a4ff' : '#d8ccff')
      }
      for (let y = 1; y < h - 1; y++) {
        for (let x = 0; x < lw; x++) {
          const dx = (x - cx) / (w * 0.26)
          const dy = (y - h * 0.6) / (h * 0.28)
          if (dx * dx + dy * dy <= 1 && l.get(x, y) === '#d8ccff') l.set(x, y, '#ffc8ec')
        }
      }
      l.set(Math.round(cx), Math.round(h * 0.6), '#fff0fa')
      for (let i = 0; i <= Math.max(1, Math.round(w / 6)); i++) l.set(Math.round(cx - w / 2) + 2 + i, 1, '#ffffff')
      const arms = c.arms
      const span = w * 0.8
      for (let i = 0; i < arms; i++) {
        const xa = cx - span / 2 + i * (span / Math.max(1, arms - 1))
        const li = Math.max(2, Math.round(len * (0.55 + (0.45 * ((i * 5) % 3)) / 2)))
        const centre = Math.abs(i - (arms - 1) / 2) < 1
        for (let dy = 1; dy <= li; dy++) {
          const x = xa + Math.round(Math.sin((dy + (frame === 'a' ? 0 : 3)) * 0.55 + i * 1.7) * 1.2)
          l.set(x, h - 1 + dy, centre ? (dy < li * 0.8 ? '#ff9fd6' : '#ffd0ea') : dy < li * 0.7 ? '#a692f2' : '#c9baff')
        }
      }
      defs += `<g id="j${key}${frame}">${l.svg()}</g>`
    }
    const halo = new Layer(c.halo * 2 + 1, c.halo * 2 + 1)
    const hs = (r, op) => {
      const hl = new Layer(c.halo * 2 + 1, c.halo * 2 + 1)
      disc(hl, c.halo, c.halo, r, '#b9a4ff')
      return `<g opacity="${op}">${hl.svg()}</g>`
    }
    void halo
    defs += `<g id="j${key}h" transform="translate(${cx - c.halo} ${c.h / 2 - c.halo})">${hs(c.halo, 0.05)}${hs(Math.round(c.halo * 0.7), 0.08)}${hs(Math.round(c.halo * 0.45), 0.12)}</g>`
  }
  const sp = new Layer(3, 3)
  disc(sp, 1, 1, 1, '#ff9ad5')
  sp.set(1, 1, '#ffe0f2')
  defs += `<g id="sp">${sp.svg()}</g>`
  return defs
}

// Une méduse qui monte : trois mouvements emboîtés (montée lente, dérive de côté, battement irrégulier),
// chacun avec sa propre durée, donc jamais deux méduses au même pas.
function jelly(rnd, type, x) {
  const pulse = (2.4 + rnd() * 2.2).toFixed(2)
  const lag = -(rnd() * 60).toFixed(1)
  const dur = type === 'L' ? 45 + rnd() * 20 : type === 'M' ? 60 + rnd() * 20 : 70 + rnd() * 20
  const sway = `sw${1 + Math.floor(rnd() * 3)}`
  const swayDur = (7 + rnd() * 8).toFixed(1)
  const swayLag = -(rnd() * 12).toFixed(1)
  const p = `animation-duration:${pulse}s;animation-delay:${lag}s`
  return (
    `<g transform="translate(${Math.round(x)} 212)"><g class="rise" style="animation-duration:${dur.toFixed(1)}s;animation-delay:${lag}s">` +
    `<g class="${sway}" style="animation-duration:${swayDur}s;animation-delay:${swayLag}s">` +
    `<use href="#j${type}h"/><g class="pulse" style="${p}">` +
    `<use href="#j${type}a" class="fa" style="${p}"/><use href="#j${type}b" class="fb" style="${p}"/>` +
    `</g></g></g></g>`
  )
}

function spore(rnd, x) {
  const dur = (45 + rnd() * 40).toFixed(1)
  const lag = -(rnd() * 80).toFixed(1)
  const sway = `sw${1 + Math.floor(rnd() * 3)}`
  const swayDur = (6 + rnd() * 8).toFixed(1)
  return (
    `<g transform="translate(${Math.round(x)} 206)"><g class="rise" style="animation-duration:${dur}s;animation-delay:${lag}s">` +
    `<g class="${sway}" style="animation-duration:${swayDur}s"><use href="#sp"/></g></g></g>`
  )
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
.v0{animation:sway 6s steps(1,end) infinite}
.v1{animation:sway 6s steps(1,end) infinite;animation-delay:-3s}
@keyframes sway{0%{transform:translateX(0)}50%{transform:translateX(1px)}}
.fogA{animation:fogA 40s steps(10,end) infinite alternate}
.fogB{animation:fogB 55s steps(12,end) infinite alternate}
@keyframes fogA{from{transform:translateX(0)}to{transform:translateX(10px)}}
@keyframes fogB{from{transform:translateX(0)}to{transform:translateX(-12px)}}
.shaft{animation:shaft 9s steps(1,end) infinite}
.shaft.b{animation-delay:-3s}
.shaft.c{animation-delay:-6s}
@keyframes shaft{0%{opacity:1}33%{opacity:.6}66%{opacity:.82}}
.head{animation:breathe 3.2s steps(1,end) infinite}
@keyframes breathe{0%{transform:translateY(0)}50%{transform:translateY(1px)}}
@media (prefers-reduced-motion: reduce){*{animation:none !important}}`

export function fogCanyonSvg() {
  const rnd = mulberry32(23)
  const far = cliff({
    color: '#0f0e38', rim: '#2a2873', w0: 46, w1: 42, amp: 10, seed: 1,
    shelvesL: [[84, 16], [128, 12]], shelvesR: [[70, 14], [118, 18]],
  })
  const mid = cliff({
    color: '#07072a', rim: '#1f1d62', w0: 30, w1: 28, amp: 8, seed: 5,
    shelvesL: [[100, 14], [146, 10]], shelvesR: [[92, 12], [136, 16]],
  })
  const near = cliff({
    color: '#03030f', rim: '#16144a', w0: 14, w1: 16, amp: 6, seed: 9, ceiling: true,
    shelvesL: [[120, 12], [158, 8]], shelvesR: [[108, 10], [150, 12]],
  })
  const floor = floorLayer(rnd, '#03030f', '#16144a')
  const solid = (x, y) => near.has(x, y) || floor.get(x, y) !== null || mid.has(x, y)
  const bulbs = plants(rnd, solid, 34, '#5a58d0')
  const r0 = roots(rnd, 0)
  const r1 = roots(rnd, 1)
  const fogA = fogLayer(rnd, 90, 150, 26)
  const fogB = fogLayer(rnd, 120, 180, 26)

  const knight = knightLayer()
  const head = new Layer(18, 14)
  const body = new Layer(18, 24)
  for (let y = 0; y < 24; y++) for (let x = 0; x < 18; x++) (y < 14 ? head : body).set(x, y, knight.get(x, y))
  const knightRim = outlineOf(knight, '#9a8cff')

  const smalls = [12, 40, 95, 185, 235, 305].map((x) => jelly(rnd, 'S', x + rnd() * 20)).join('')
  const mediums = [70, 110, 205, 290].map((x) => jelly(rnd, 'M', x + rnd() * 16)).join('')
  const larges = [24, 140, 250].map((x) => jelly(rnd, 'L', x + rnd() * 14)).join('')
  const spores = Array.from({ length: 16 }, () => spore(rnd, 6 + rnd() * 300)).join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" ` +
    `preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges"><style>${STYLE}</style>` +
    `<defs>${jellyDefs()}</defs><g transform="scale(5)">` +
    bandsSvg('f', BANDS, 0, H) +
    `<g class="shaft"><polygon points="100,0 140,0 210,190 150,190" fill="#cdbfff" opacity=".06"/></g>` +
    `<g class="shaft b"><polygon points="190,0 215,0 262,190 228,190" fill="#cdbfff" opacity=".05"/></g>` +
    `<g class="shaft c"><polygon points="40,0 66,0 110,190 78,190" fill="#cdbfff" opacity=".05"/></g>` +
    far.svg() +
    `<g class="fogA" opacity=".07">${fogA.svg()}</g>` +
    smalls +
    mid.svg() +
    mediums +
    `<g class="fogB" opacity=".07">${fogB.svg()}</g>` +
    larges +
    near.svg() +
    floor.svg() +
    bulbs.svg() +
    `<g transform="translate(266 164)" opacity=".5">${knightRim.svg()}</g>` +
    `<g transform="translate(266 164)">${body.svg()}<g class="head">${head.svg()}</g></g>` +
    `<g class="v0">${r0.svg()}</g><g class="v1">${r1.svg()}</g>` +
    spores +
    `</g></svg>`
  )
}
