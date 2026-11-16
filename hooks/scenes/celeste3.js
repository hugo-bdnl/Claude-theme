// Celeste, niveau 3 : une grotte orange et verte aux contours de cristal cyan, dans l'esprit de la capture officielle 11
// (celestegame.com) : un puits vertical à droite, un couloir qui mène à une grande salle à gauche, de la mousse verte,
// des fleurs rouges, des rochers bordeaux, des pointes magenta, et des plumes dorées.
// Madeline RÉUSSIT le niveau avec la mécanique des plumes : elle saute dans une plume, devient une étoile qui vole librement
// (jusqu'à environ 2 s, à 190 px/s), remonte le puits et traverse le couloir en évitant les pointes magenta, se pose,
// attrape une seconde plume, redescend dans la salle en zigzaguant entre les pointes, prend la fraise ; puis fondu au noir.
// Dessin original, sur une grille de 320 x 200 pixels (1 pixel = 5 unités du SVG), proche du 320 x 180 du jeu.
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.

import { W, H, Layer, mulberry32, bandsSvg, disc, foliage } from './pixel.js'
import { madelineDefs } from './madeline.js'
import { timeline, run, madelineWithTrail, freezeCss } from './timeline.js'

const P = 8.2

// L'intérieur de la grotte : le puits à droite, le couloir en haut, la grande salle à gauche.
const free = (x, y) =>
  (x >= 236 && x <= 282 && y >= 30 && y <= 192) ||
  (x >= 100 && x <= 282 && y >= 40 && y <= 72) ||
  Math.hypot(x - 66, y - 104) <= 50 ||
  (x >= 24 && x <= 112 && y >= 100 && y <= 156)

// L'extérieur (l'espace sombre), dessiné par rangées.
function outside() {
  const l = new Layer()
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!free(x, y)) l.set(x, y, '#05051f')
  return l
}

// Le contour de cristal : trois pixels d'épaisseur autour de l'intérieur, du plus clair au plus sombre en s'éloignant.
function rim() {
  const l = new Layer()
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (free(x, y)) continue
      let best = 4
      for (let dy = -3; dy <= 3 && best > 1; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (free(x + dx, y + dy)) best = Math.min(best, Math.max(Math.abs(dx), Math.abs(dy)))
        }
      }
      if (best <= 3) l.set(x, y, best === 1 ? '#b8fcff' : best === 2 ? '#2ad8f0' : '#1a88c0')
    }
  }
  return l
}

// Y a-t-il de l'intérieur de la grotte à moins de d pixels ?
const nearFree = (x, y, d) => {
  for (let dy = -d; dy <= d; dy += 2) for (let dx = -d; dx <= d; dx += 2) if (free(x + dx, y + dy)) return true
  return false
}

const nearWall = (x, y, d) => {
  for (let dy = -d; dy <= d; dy += 2) for (let dx = -d; dx <= d; dx += 2) if (!free(x + dx, y + dy)) return true
  return false
}

// Mousse verte le long des parois, rochers bordeaux au fond, fleurs rouges.
function plants(rnd) {
  const l = new Layer()
  for (const [x, y, r] of [[66, 106, 18], [86, 98, 12], [52, 132, 14], [180, 62, 9], [240, 150, 9], [262, 120, 8]]) {
    disc(l, x, y, r, '#7a3a50')
    disc(l, x - 2, y - 2, Math.max(2, r - 5), '#9a4a64')
  }
  const tones = [
    { base: '#2a6a30', light: '#4a9a48' },
    { base: '#3a8a40', light: '#6ad060' },
    { base: '#1f5a38', light: '#3a8a50' },
  ]
  foliage(l, rnd, (x, y) => free(x, y) && nearWall(x, y, 8), { x0: 0, x1: W, y0: 20, y1: 196 }, 150, 2, 4, tones, ['#9af8a0', '#ffe060'], 0.4)
  for (const [x, y] of [[30, 154], [98, 154], [250, 190], [270, 190], [60, 154]]) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) l.set(x + dx, y + dy, dx === 0 && dy === 0 ? '#ffe060' : '#e83a3a')
  }
  return l
}

// Les étoiles de l'espace autour de la grotte.
function stars(rnd) {
  let out = ''
  const colors = ['#ffffff', '#78e0e8', '#c8d8ff', '#ffb0e8']
  for (let i = 0; i < 90; i++) {
    const x = Math.round(rnd() * W)
    const y = Math.round(rnd() * H)
    if (nearFree(x, y, 6)) continue
    out += `<path class="tw t${i % 3}" style="animation-delay:-${(rnd() * 6).toFixed(1)}s" fill="${colors[i % 4]}" d="M${x} ${y}h1v1h-1z"/>`
  }
  return out
}

// Une pointe magenta (un « spinner ») : deux images, pointes en croix puis en diagonale, qui alternent.
function spinner(diag) {
  const l = new Layer(13, 13)
  const c = 6
  disc(l, c, c, 2, '#e040e0')
  l.set(c, c, '#ff90ff')
  const dirs = diag ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]]
  for (const [dx, dy] of dirs) {
    for (let k = 3; k <= 5; k++) l.set(c + dx * k, c + dy * k, k === 5 ? '#ffffff' : k === 4 ? '#ff90ff' : '#c020c0')
  }
  return l
}

// Une plume dorée.
function feather() {
  const l = new Layer(9, 15)
  for (let y = 0; y < 15; y++) {
    const half = y < 3 ? 1 : y < 11 ? 3 : 2 - Math.floor((y - 10) / 2)
    for (let x = 4 - half; x <= 4 + half; x++) l.set(x, y, x < 4 ? '#fffbe0' : '#ffe060')
    l.set(4, y, '#e8a820')
  }
  for (const [x, y] of [[2, 6], [3, 4], [6, 8], [5, 10]]) l.set(x, y, '#e8a820')
  return l
}

// La fraise.
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

function halo(cx, cy, r, color) {
  return [[1, 0.06], [0.66, 0.1], [0.36, 0.16]]
    .map(([k, op]) => `<ellipse cx="${cx}" cy="${cy}" rx="${Math.round(r * k)}" ry="${Math.round(r * k)}" fill="${color}" opacity="${op}"/>`)
    .join('')
}

// ---------- Le parcours de Madeline ----------
const F1 = [262, 168]
const F2 = [100, 64]
const BERRY = [38, 148]

function route() {
  const w = []
  const at = (t, x, y, n, pose, flip) => w.push({ t, x, y, n, pose, hair: 'red', flip })
  at(0, 256, 192, 1, 'idle', false)
  run(w, 0.6, 0.95, 256, 266, 192, false, 'red')
  at(0.95, 266, 192, 3, 'air', false) // elle saute vers la plume
  at(1.1, 264, 178, 2, 'air', false)
  // Plume n°1 : elle devient une étoile et file en haut du puits, puis à gauche dans le couloir, entre les pointes.
  at(1.2, F1[0], F1[1], 6, 'star', false)
  at(1.75, 262, 76, 3, 'star', false)
  at(1.9, 248, 56, 3, 'star', false)
  at(2.1, 222, 50, 3, 'star', false)
  at(2.3, 198, 60, 3, 'star', false)
  at(2.5, 172, 52, 3, 'star', false)
  at(2.7, 148, 58, 3, 'star', false)
  at(2.9, 130, 62, 2, 'fall', true) // la plume est finie : elle retombe sur le sol du couloir
  at(3.1, 128, 72, 2, 'run2', true)
  run(w, 3.3, 3.8, 128, 104, 72, true, 'red')
  at(3.8, 104, 72, 3, 'air', true) // elle saute vers la seconde plume
  at(3.95, 101, 66, 2, 'air', true)
  // Plume n°2 : elle redescend dans la grande salle en zigzaguant entre les pointes.
  at(4.0, F2[0], F2[1], 4, 'star', true)
  at(4.25, 84, 86, 4, 'star', true)
  at(4.5, 76, 106, 4, 'star', true)
  at(4.75, 62, 122, 4, 'star', true)
  at(5.0, 50, 138, 4, 'star', true)
  at(5.2, 40, 150, 2, 'fall', true)
  at(5.35, 40, 156, 2, 'run2', true) // elle se pose et prend la fraise
  at(5.6, 38, 156, 1, 'idle', true)
  at(6.7, 256, 192, 1, 'idle', false) // fondu au noir : retour au départ
  at(7.3, 256, 192, 1, 'idle', false)
  return w
}

const pct = (t) => ((t / P) * 100).toFixed(3) + '%'

function visible(name, shown) {
  const marks = new Set([0])
  for (const [a, b] of shown) {
    if (a > 0) marks.add(a)
    if (b < P) marks.add(b)
  }
  const pts = [...marks].sort((x, y) => x - y)
  const on = (t) => shown.some(([a, b]) => t >= a - 1e-9 && t < b - 1e-9)
  return `@keyframes ${name}{${pts.map((t) => `${pct(t)}{opacity:${on(t + 0.0005) ? 1 : 0}}`).join('')}}`
}

const CSS = `${timeline(P, route())}
.f1{animation:f1 ${P}s steps(1,end) infinite}
${visible('f1', [[0, 1.2], [6.7, P]])}
.f2{animation:f2 ${P}s steps(1,end) infinite}
${visible('f2', [[0, 4.0], [6.7, P]])}
.berry{animation:berry ${P}s steps(1,end) infinite}
${visible('berry', [[0, 5.6], [6.8, P]])}
.fade{animation:fade ${P}s steps(1,end) infinite}
@keyframes fade{0%{opacity:0}${pct(6.2)}{opacity:.3}${pct(6.3)}{opacity:.6}${pct(6.4)}{opacity:1}${pct(6.95)}{opacity:1}${pct(7.05)}{opacity:.6}${pct(7.15)}{opacity:.3}${pct(7.25)}{opacity:0}}
.sa{animation:sa 0.7s steps(1,end) infinite}
.sb{animation:sb 0.7s steps(1,end) infinite}
@keyframes sa{0%{opacity:1}50%{opacity:0}}
@keyframes sb{0%{opacity:0}50%{opacity:1}}
.bob{animation:bob 1.6s steps(1,end) infinite}
@keyframes bob{0%{transform:translateY(0)}25%{transform:translateY(1px)}50%{transform:translateY(0)}75%{transform:translateY(-1px)}}
.glow{animation:glow 2.4s steps(1,end) infinite}
@keyframes glow{0%{opacity:1}50%{opacity:.7}}
.tw{animation:tw 3s steps(1,end) infinite}
.t1{animation-duration:4.3s}
.t2{animation-duration:2.6s}
@keyframes tw{0%{opacity:1}45%{opacity:.25}70%{opacity:1}}
@media (prefers-reduced-motion: reduce){*{animation:none !important}}`

// Une pointe magenta à sa place : les deux images alternent.
function spin(x, y, a, b) {
  return `<g transform="translate(${x - 6} ${y - 6})"><g class="sa">${a.svg()}</g><g class="sb">${b.svg()}</g></g>`
}

export function celeste3Svg(at) {
  const rnd = mulberry32(31)
  const space = outside()
  const edge = rim()
  const decor = plants(rnd)
  const sa = spinner(false)
  const sb = spinner(true)
  const feat = feather()
  const fruit = berry()
  const spinners = [[235, 44], [185, 44], [160, 44], [210, 68], [134, 68], [100, 98], [60, 110], [86, 128], [48, 122]]
    .map(([x, y]) => spin(x, y, sa, sb))
    .join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" ` +
    `preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges"><style>${CSS}${freezeCss(at)}${at === undefined ? '' : `.f1,.f2,.berry,.fade{animation-delay:-${at}s;animation-play-state:paused}`}</style>` +
    `<defs>${madelineDefs()}</defs><g transform="scale(5)">` +
    bandsSvg('k', ['#ffc860', '#ffb050', '#ff9a40', '#e87a3a', '#c85a38'], 20, 200) +
    `<rect width="320" height="20" fill="#ffc860"/>` +
    decor.svg() +
    space.svg() +
    stars(rnd) +
    edge.svg() +
    // Le pont de bois au pied du puits.
    `<rect x="236" y="190" width="47" height="3" fill="#c87850"/><rect x="236" y="192" width="47" height="1" fill="#8a4a30"/>` +
    spinners +
    // Les plumes, la fraise.
    `<g class="f1"><g class="glow">${halo(F1[0], F1[1], 12, '#ffe060')}</g><g transform="translate(${F1[0] - 4} ${F1[1] - 7})"><g class="bob">${feat.svg()}</g></g></g>` +
    `<g class="f2"><g class="glow">${halo(F2[0], F2[1], 12, '#ffe060')}</g><g transform="translate(${F2[0] - 4} ${F2[1] - 7})"><g class="bob">${feat.svg()}</g></g></g>` +
    `<g class="berry"><g transform="translate(${BERRY[0] - 4} ${BERRY[1] - 8})"><g class="bob">${fruit.svg()}</g></g></g>` +
    madelineWithTrail(at, '#m-ghost-star') +
    `<rect class="fade" width="320" height="200" fill="#000" opacity="0"/>` +
    `</g></svg>`
  )
}
