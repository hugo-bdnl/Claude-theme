// Celeste, niveau 2 : des ruines de nuit, dans l'esprit de la capture officielle 02 (celestegame.com) :
// ciel bleu nuit, silhouettes de bâtiments en ruine, poutrelles d'acier bleues, glace et neige sur les bords,
// pointes blanches, cristal vert qui rend le dash.
// Madeline RÉUSSIT le niveau avec les mécaniques du jeu : elle court, saute, s'agrippe au mur et grimpe,
// fait un dash en diagonale par-dessus les pointes (cheveux blancs, puis cyan sans dash), attrape le cristal vert
// (le dash revient, le cristal disparaît 2,5 s), refait un dash, atterrit, prend la fraise, atteint la sortie ;
// puis fondu au noir et retour au départ.
// Dessin original, sur une grille de 320 x 200 pixels (1 pixel = 5 unités du SVG), proche du 320 x 180 du jeu.
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.

import { W, H, Layer, mulberry32, noise, bandsSvg, disc } from './pixel.js'
import { madelineDefs } from './madeline.js'
import { timeline, run, madelineWithTrail, freezeCss } from './timeline.js'

const SKY = ['#04081a', '#070e26', '#0a1632', '#0e1c3e']
const P = 6.6

// Une poutrelle d'acier : un cadre bleu foncé, des croisillons clairs.
function girder(w, h) {
  const l = new Layer(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || x === w - 1 || y === 0 || y === h - 1
      const cross = (x + y) % w === 0 || (x + (h - y)) % w === 0 || (y % w === 0 && !edge)
      l.set(x, y, edge ? '#2a3aa0' : cross ? '#6a8aff' : '#141c58')
    }
  }
  return l
}

// Un bloc : un corps sombre, un dessus de neige blanche avec du bleu glacé qui déborde sur les côtés.
function block(x0, y0, x1, y1, rnd, sides) {
  const l = new Layer()
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dy = y - y0
      let c = rnd() < 0.06 ? '#172444' : '#0f1830'
      if (dy === 0) c = '#eaf4ff'
      else if (dy === 1) c = '#cfe2ff'
      else if (dy === 2) c = '#9ec0ff'
      else if (dy < 6 && rnd() < 0.35) c = '#3a6aff'
      else if (sides && (x === x0 || x === x1) && rnd() < 0.7) c = '#4a7aff'
      else if (sides && (x === x0 + 1 || x === x1 - 1) && rnd() < 0.25) c = '#3a6aff'
      l.set(x, y, c)
    }
  }
  return l
}

// Pierre moussue de la tour.
function mossy(x0, y0, x1, y1, rnd) {
  const l = new Layer()
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const brick = (y - y0) % 8 === 0 || (x + ((Math.floor((y - y0) / 8) % 2) * 5)) % 10 === 0
      l.set(x, y, brick ? '#1c2c2c' : rnd() < 0.12 ? '#4c8a50' : rnd() < 0.2 ? '#3a5a44' : '#2c4038')
    }
  }
  return l
}

// Une rangée de pointes blanches, la pointe vers le haut.
function spikes(x0, x1, y) {
  let d = ''
  for (let x = x0; x + 4 <= x1; x += 4) d += `M${x} ${y}l2 -5l2 5z`
  return `<path fill="#ffffff" d="${d}"/>`
}

// Ruines au loin : des silhouettes de bâtiments, avec quelques fenêtres allumées.
function ruins(rnd) {
  let out = ''
  for (let layer = 0; layer < 2; layer++) {
    const color = layer === 0 ? '#0a1430' : '#0d1a3a'
    let x = -4
    while (x < W) {
      const w = 10 + Math.floor(rnd() * 16)
      const top = (layer === 0 ? 70 : 96) + Math.floor(rnd() * 50)
      out += `<rect x="${x}" y="${top}" width="${w}" height="${200 - top}" fill="${color}"/>`
      if (rnd() < 0.6) out += `<rect x="${x + 2}" y="${top - 5}" width="${Math.max(3, w - 5)}" height="5" fill="${color}"/>`
      for (let k = 0; k < 2; k++) if (rnd() < 0.5) out += `<rect x="${x + 2 + Math.floor(rnd() * (w - 5))}" y="${top + 6 + Math.floor(rnd() * 30)}" width="2" height="2" fill="#2a4a8a" opacity=".7"/>`
      x += w + Math.floor(rnd() * 6)
    }
  }
  return out
}

function stars(rnd) {
  let out = ''
  const colors = ['#ffffff', '#78e0e8', '#c8d8ff']
  for (let i = 0; i < 46; i++) {
    const x = Math.round(rnd() * W)
    const y = Math.round(rnd() * 90)
    out += `<path class="tw t${i % 3}" style="animation-delay:-${(rnd() * 6).toFixed(1)}s" fill="${colors[i % 3]}" d="M${x} ${y}h1v1h-1z"/>`
  }
  return out
}

function snow(rnd) {
  let out = ''
  for (let i = 0; i < 40; i++) {
    const x = Math.round(rnd() * (W + 20))
    const dur = (7 + rnd() * 8).toFixed(1)
    const lag = -(rnd() * 14).toFixed(1)
    const big = rnd() < 0.25
    out += `<g class="snow" style="animation-duration:${dur}s;animation-delay:${lag}s"><rect x="${x}" y="-6" width="${big ? 2 : 1}" height="${big ? 2 : 1}" fill="#ffffff" opacity="${big ? 0.95 : 0.75}"/></g>`
  }
  return out
}

// Le cristal vert qui rend le dash : un losange, un reflet, un halo.
function crystal() {
  const l = new Layer(7, 9)
  for (let y = 0; y < 9; y++) {
    const half = y < 5 ? y : 8 - y
    for (let x = 3 - Math.min(half, 3); x <= 3 + Math.min(half, 3); x++) l.set(x, y, x < 3 ? '#b8ffb8' : '#58e060')
  }
  for (const [x, y] of [[3, 4], [2, 4], [3, 3]]) l.set(x, y, '#e8ffe8')
  for (const [x, y] of [[4, 5], [3, 6], [4, 6]]) l.set(x, y, '#2a9a38')
  return l
}

// La fraise : un corps rouge, des graines claires, un chapeau vert.
function berry() {
  const l = new Layer(9, 10)
  for (let y = 2; y < 9; y++) {
    const half = y < 5 ? 2 + y : 4 - (y - 5) / 2 + 1
    for (let x = Math.round(4 - half); x <= Math.round(4 + half); x++) l.set(x, y, x > 4 ? '#a01a30' : '#e83a4a')
  }
  for (const [x, y] of [[2, 4], [5, 5], [3, 6], [6, 4], [4, 7]]) l.set(x, y, '#ffe0a0')
  for (const [x, y] of [[2, 1], [3, 1], [4, 0], [5, 1], [6, 1], [3, 2], [5, 2]]) l.set(x, y, '#4ac850')
  return l
}

// La sortie : une arche de lumière chaude.
function goal() {
  const l = new Layer(18, 30)
  for (let y = 0; y < 30; y++) {
    const half = y < 9 ? Math.round(Math.sqrt(81 - (9 - y) * (9 - y))) : 9
    for (let x = 9 - half; x <= 9 + half - 1; x++) {
      const edge = x <= 9 - half + 1 || x >= 9 + half - 2 || y < 2
      l.set(x, y, edge ? '#6a8aff' : y < 14 ? '#fff6d0' : '#ffe9a0')
    }
  }
  return l
}

// ---------- Le parcours de Madeline ----------
function route() {
  const w = []
  const at = (t, x, y, n, pose, hair) => w.push({ t, x, y, n, pose, hair, flip: false })
  at(0, 30, 168, 1, 'idle', 'red')
  run(w, 0.5, 1.1, 30, 80, 168, false, 'red')
  at(1.1, 80, 168, 3, 'air', 'red') // elle saute vers la tour
  at(1.35, 86, 148, 3, 'air', 'red')
  at(1.5, 88, 140, 6, 'wall', 'red') // elle s'agrippe au mur et grimpe
  at(2.1, 88, 122, 4, 'dash', 'white') // dash en diagonale, par-dessus les pointes
  at(2.25, 112, 100, 4, 'air', 'cyan') // plus de dash : cheveux cyan
  at(2.65, 150, 86, 1, 'air', 'red') // elle touche le cristal vert : le dash revient
  at(2.7, 152, 86, 4, 'dash', 'white') // second dash
  at(2.85, 182, 100, 4, 'air', 'cyan')
  at(3.25, 214, 116, 3, 'fall', 'cyan')
  at(3.45, 228, 120, 2, 'run2', 'red') // elle atterrit : le dash revient
  at(3.75, 238, 120, 1, 'idle', 'red')
  run(w, 3.9, 4.4, 238, 256, 120, false, 'red') // elle prend la fraise
  run(w, 4.4, 5.2, 256, 300, 120, false, 'red') // et court vers la sortie
  at(5.2, 300, 120, 1, 'idle', 'red')
  at(5.75, 30, 168, 1, 'idle', 'red') // fondu au noir : retour au départ
  at(6.1, 30, 168, 1, 'idle', 'red')
  return w
}

// Une piste d'opacité : visible sur certains intervalles, caché le reste du temps.
function visible(name, shown) {
  const marks = new Set([0])
  for (const [a, b] of shown) {
    if (a > 0) marks.add(a)
    if (b < P) marks.add(b)
  }
  const pts = [...marks].sort((x, y) => x - y)
  const on = (t) => shown.some(([a, b]) => t >= a - 1e-9 && t < b - 1e-9)
  return `@keyframes ${name}{${pts.map((t) => `${((t / P) * 100).toFixed(3)}%{opacity:${on(t + 0.0005) ? 1 : 0}}`).join('')}}`
}

const pct = (t) => ((t / P) * 100).toFixed(3) + '%'

const CSS = `${timeline(P, route())}
.crystal{animation:crystal ${P}s steps(1,end) infinite}
${visible('crystal', [[0, 2.65], [5.15, P]])}
.berry{animation:berry ${P}s steps(1,end) infinite}
${visible('berry', [[0, 4.4], [5.8, P]])}
.fade{animation:fade ${P}s steps(1,end) infinite}
@keyframes fade{0%{opacity:0}${pct(5.4)}{opacity:.3}${pct(5.5)}{opacity:.6}${pct(5.6)}{opacity:1}${pct(5.85)}{opacity:1}${pct(5.95)}{opacity:.6}${pct(6.05)}{opacity:.3}${pct(6.15)}{opacity:0}}
.bob{animation:bob 1.6s steps(1,end) infinite}
@keyframes bob{0%{transform:translateY(0)}25%{transform:translateY(1px)}50%{transform:translateY(0)}75%{transform:translateY(-1px)}}
.glow{animation:glow 2.4s steps(1,end) infinite}
@keyframes glow{0%{opacity:1}50%{opacity:.7}}
.snow{animation:snow 10s steps(70,end) infinite}
@keyframes snow{from{transform:translate(0,0)}to{transform:translate(-16px,212px)}}
.tw{animation:tw 3s steps(1,end) infinite}
.t1{animation-duration:4.3s}
.t2{animation-duration:2.6s}
@keyframes tw{0%{opacity:1}45%{opacity:.25}70%{opacity:1}}
@media (prefers-reduced-motion: reduce){*{animation:none !important}}`

function halo(cx, cy, r, color) {
  return [[1, 0.06], [0.66, 0.1], [0.36, 0.16]]
    .map(([k, op]) => `<ellipse cx="${cx}" cy="${cy}" rx="${Math.round(r * k)}" ry="${Math.round(r * k)}" fill="${color}" opacity="${op}"/>`)
    .join('')
}

export function celeste2Svg(at) {
  const rnd = mulberry32(12)
  const start = block(0, 168, 64, 199, rnd, true)
  const tower = mossy(96, 120, 119, 199, rnd)
  const topRim = block(92, 118, 123, 121, rnd, false)
  const farRight = block(226, 120, 319, 199, rnd, true)
  const gl = girder(4, 82)
  const gr = girder(4, 82)
  const gp = girder(5, 80)
  const gem = crystal()
  const fruit = berry()
  const exit = goal()

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" ` +
    `preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges"><style>${CSS}${freezeCss(at)}${at === undefined ? '' : `.crystal,.berry,.fade{animation-delay:-${at}s;animation-play-state:paused}`}</style>` +
    `<defs>${madelineDefs()}</defs><g transform="scale(5)">` +
    bandsSvg('r', SKY, 0, 200) +
    stars(rnd) +
    ruins(rnd) +
    `<rect y="120" width="320" height="80" fill="#1a2a60" opacity=".12"/>` +
    // Le sol du gouffre : des pointes tout en bas.
    `<rect y="192" width="320" height="8" fill="#0a1020"/>` +
    spikes(64, 226, 192) +
    start.svg() +
    // La tour : pierre moussue, poutrelles de chaque côté, pointes sur le dessus.
    tower.svg() +
    `<g transform="translate(92 119)">${gl.svg()}</g><g transform="translate(120 119)">${gr.svg()}</g>` +
    topRim.svg() +
    spikes(94, 122, 118) +
    farRight.svg() +
    `<g transform="translate(224 120)">${gp.svg()}</g>` +
    // Le cristal, la fraise, la sortie.
    `<g class="crystal"><g class="glow">${halo(152, 86, 12, '#58e060')}</g><g transform="translate(149 81)"><g class="bob">${gem.svg()}</g></g></g>` +
    `<g class="berry"><g transform="translate(250 106)"><g class="bob">${fruit.svg()}</g></g></g>` +
    `<g class="glow">${halo(304, 108, 22, '#ffe9a0')}</g><g transform="translate(295 90)">${exit.svg()}</g>` +
    madelineWithTrail(at) +
    snow(rnd) +
    `<rect class="fade" width="320" height="200" fill="#000" opacity="0"/>` +
    `</g></svg>`
  )
}
