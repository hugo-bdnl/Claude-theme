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

// Le petit chevalier, d'après les modèles du jeu : tête très large et plate dessus, grandes cornes en arc dont le bout
// se recourbe vers l'intérieur, grands yeux ovales bas, petite cape bleu-gris rayée au bas dentelé, jambes courtes,
// et son clou (l'épée) tenu bas, qui passe derrière le corps. Grille de 20 x 25 ; la tête occupe les rangées 0 à 16.
export const KNIGHT_HEAD_ROWS = 17
export function knightLayer() {
  const l = new Layer(20, 25)
  const W_ = '#f6f8f6'
  const S_ = '#c4cfcd'
  const E_ = '#05070c'
  const row = (y, x0, x1, c) => {
    for (let x = x0; x <= x1; x++) l.set(x, y, c)
  }
  // Le clou d'abord, pour qu'il passe derrière le corps : de la main vers le bas à droite.
  for (let x = 4; x <= 19; x++) {
    const y = 18 + Math.round(((x - 4) * 5) / 15)
    l.set(x, y, '#e6edf1')
    l.set(x, y + 1, '#c1ccd3')
    l.set(x, y + 2, '#8c97a6')
  }
  for (const [x, y] of [[1, 17], [2, 17], [2, 18]]) l.set(x, y, '#3a4258')
  for (const y of [17, 18, 19, 20]) l.set(3, y, '#aab4be')
  // Cornes : montent en arc vers l'extérieur, le bout revient vers l'intérieur.
  const horn = [[5, 6], [4, 6], [4, 5], [5, 5], [3, 4], [4, 4], [2, 3], [3, 3], [2, 2], [3, 2], [2, 1], [3, 1], [3, 0], [4, 0]]
  for (const [x, y] of horn) {
    l.set(x, y, W_)
    l.set(19 - x, y, W_)
  }
  // Tête.
  row(6, 4, 15, W_)
  row(7, 3, 16, W_)
  for (let y = 8; y <= 13; y++) row(y, 2, 17, W_)
  row(14, 3, 16, W_)
  row(15, 4, 15, W_)
  row(16, 7, 12, S_)
  for (let y = 8; y <= 13; y++) l.set(17, y, S_)
  row(15, 13, 15, S_)
  // Yeux ovales, bas dans la tête.
  for (const x0 of [4, 11]) {
    row(10, x0 + 1, x0 + 3, E_)
    row(11, x0, x0 + 4, E_)
    row(12, x0, x0 + 4, E_)
    row(13, x0 + 1, x0 + 3, E_)
  }
  // Cape bleu-gris à rayures en biais, bas dentelé, jambes noires.
  const C_ = '#222b49'
  row(17, 8, 11, C_)
  row(18, 7, 12, C_)
  row(19, 6, 13, C_)
  row(20, 6, 13, C_)
  row(21, 5, 14, C_)
  row(22, 5, 14, C_)
  for (let y = 18; y <= 22; y++) {
    l.set(7 + ((y - 18) >> 1), y, '#37436e')
    l.set(12 - ((y - 18) >> 1), y, '#37436e')
  }
  for (const x of [5, 6, 9, 10, 13, 14]) l.set(x, 23, '#1a2240')
  for (const x of [7, 8, 11, 12]) {
    l.set(x, 23, E_)
    l.set(x, 24, E_)
  }
  // Bras et main qui tiennent le clou.
  l.set(5, 19, C_)
  l.set(5, 20, C_)
  l.set(4, 19, S_)
  return l
}
