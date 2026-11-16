// Outils communs pour dessiner des scènes en pixel art (grille de 320 x 200, 1 pixel = 5 unités du SVG).
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.

export const W = 320
export const H = 200

export function mulberry32(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const noise = (x) => Math.sin(x * 0.37) + 0.5 * Math.sin(x * 0.91 + 2)
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// Une grille de pixels colorés qui sort en un <path> par couleur (traits horizontaux fusionnés, écriture relative).
export class Layer {
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

export function disc(layer, cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r + r * 0.6) layer.set(cx + dx, cy + dy, color)
    }
  }
}

// Des bandes de couleur, avec trois rangées de trame (25 %, 50 %, 75 %) entre deux bandes : léger en poids.
export function bandsSvg(id, bands, y0, y1) {
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

// Un amas de feuillage : des disques qui se recouvrent, un éclat en haut à gauche, quelques points clairs.
// region(x, y) dit où l'on a le droit de dessiner ; dens règle la densité des éclats et des points.
export function foliage(layer, rnd, region, box, count, rMin, rMax, tones, glints, dens = 1) {
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

export function outlineOf(layer, color) {
  const out = new Layer(layer.w, layer.h)
  for (let y = 0; y < layer.h; y++) {
    for (let x = 0; x < layer.w; x++) {
      if (layer.get(x, y)) continue
      if (layer.get(x - 1, y) || layer.get(x + 1, y) || layer.get(x, y - 1) || layer.get(x, y + 1)) out.set(x, y, color)
    }
  }
  return out
}

// Le petit chevalier à la grosse tête blanche : très grande tête, longues cornes recourbées, yeux ronds, cape rayée, clou.
export function knightLayer() {
  const l = new Layer(18, 24)
  const W_ = '#f4f7f5'
  const S_ = '#bfcac8'
  const E_ = '#05070c'
  const row = (y, x0, x1, c) => {
    for (let x = x0; x <= x1; x++) l.set(x, y, c)
  }
  const horn = [
    [4, 5], [3, 5], [3, 4], [4, 4], [2, 3], [3, 3], [1, 3], [1, 2], [2, 2], [0, 1], [1, 1], [0, 0], [1, 0], [2, 0],
  ]
  for (const [x, y] of horn) {
    l.set(x, y, W_)
    l.set(17 - x, y, W_)
  }
  row(5, 5, 12, W_)
  row(6, 4, 13, W_)
  for (let y = 7; y <= 11; y++) row(y, 3, 14, W_)
  row(12, 4, 13, W_)
  row(13, 6, 11, S_)
  for (let y = 7; y <= 12; y++) l.set(y === 12 ? 13 : 14, y, S_)
  for (const x0 of [4, 10]) {
    row(8, x0 + 1, x0 + 2, E_)
    row(9, x0, x0 + 3, E_)
    row(10, x0, x0 + 3, E_)
    row(11, x0 + 1, x0 + 2, E_)
  }
  row(14, 7, 10, '#222b49')
  row(15, 6, 11, '#222b49')
  for (let y = 16; y <= 20; y++) {
    row(y, 5, 12, '#222b49')
    for (let x = 6; x <= 11; x += 2) l.set(x, y, '#37436e')
  }
  row(21, 6, 11, '#1a2240')
  for (const x of [6, 7, 10, 11]) {
    l.set(x, 22, E_)
    l.set(x, 23, E_)
  }
  for (const [x, y] of [[13, 15], [14, 16], [14, 17], [15, 18], [15, 19], [16, 20], [16, 21]]) l.set(x, y, '#cfd9d6')
  l.set(12, 15, E_)
  return l
}
