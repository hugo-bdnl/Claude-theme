// Celeste : la Cité oubliée de nuit, dans l'esprit des captures officielles du jeu (celestegame.com) :
// ciel bleu nuit étoilé, montagnes enneigées, sapins sombres, corniches enneigées, chalet éclairé, lampadaire,
// neige qui tombe, et Madeline qui traverse l'écran en double dash d'une corniche à l'autre.
// Dessin original, sur une grille de 320 x 200 pixels (1 pixel = 5 unités du SVG), proche du 320 x 180 du jeu.
// Couleurs de cheveux de Madeline comme dans le jeu : auburn (1 dash), blanc (pendant le dash), cyan (0 dash), rose (2 dashes).
// RÈGLE : les sujets restent sur les bords (corniches gauche et droite) ; le centre n'a que du décor lointain,
// et Madeline le traverse en dash.
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.

import { W, H, Layer, mulberry32, noise, bandsSvg, disc } from './pixel.js'
import { madelineDefs, madelinePose } from './madeline.js'

const GROUND_Y = 150
const SKY = ['#080618', '#0d0c2e', '#161a56', '#222c80', '#3040a0']
const SNOW = '#ffffff'
const SNOW_SHADE = '#c8dcf8'
const SNOW_BLUE = '#6b8cff'

// Une crête de montagne en escalier : une couche de neige dessous, le corps par-dessus un peu plus bas.
function ridge(fn, y1, color) {
  let d = `M0 ${y1}V${Math.round(fn(0))}`
  for (let x = 2; x <= W; x += 2) d += `H${x}V${Math.round(fn(x))}`
  return `<path fill="${color}" d="${d}V${y1}z"/>`
}

const farTop = (x) => 112 - 20 * Math.abs(Math.sin(x * 0.021 + 0.6)) - 10 * Math.sin(x * 0.067)
const nearTop = (x) => 130 - 14 * Math.abs(Math.sin(x * 0.032 + 2)) - 6 * Math.sin(x * 0.11)

function mountains() {
  const cap = (x) => 4 + 3 * Math.sin(x * 0.4) * Math.sin(x * 0.4) + 2 * Math.abs(Math.sin(x * 0.09))
  return (
    ridge(farTop, 170, '#a8bcff') +
    ridge((x) => farTop(x) + cap(x), 170, '#0e1340') +
    ridge(nearTop, 170, '#8aa0f0') +
    ridge((x) => nearTop(x) + cap(x + 7) + 1, 170, '#080c2e')
  )
}

// Un sapin enneigé : des étages de plus en plus larges, la pointe de chaque étage couverte de neige.
function pine(w, h) {
  const l = new Layer(w, h)
  const tiers = Math.max(3, Math.round(h / 7))
  const th = h / tiers
  const cx = (w - 1) / 2
  for (let k = 0; k < tiers; k++) {
    const y0 = Math.round(k * th)
    const y1 = Math.round((k + 1) * th) + 1
    const maxHalf = 1 + ((k + 1) / tiers) * (w / 2 - 1)
    for (let y = y0; y < Math.min(y1, h - 3); y++) {
      const t = (y - y0) / Math.max(1, y1 - y0)
      const half = Math.max(0.5, maxHalf * (0.35 + 0.65 * t))
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        l.set(x, y, y - y0 < 2 ? SNOW_SHADE : x > cx ? '#0a1618' : '#0f2426')
      }
    }
  }
  for (let y = h - 3; y < h; y++) l.set(Math.round(cx), y, '#3a2218')
  return l
}

// Une corniche enneigée : un haut de neige blanche avec un liseré bleu, de la terre sombre dessous.
function ledge(side, rnd) {
  const l = new Layer()
  const top = (x) => GROUND_Y + Math.round(1.2 * noise(x * 0.5))
  const reach = (y) => 74 + Math.round(3 * Math.sin(y * 0.3)) - (y > 175 ? 4 : 0)
  for (let y = 0; y < H; y++) {
    for (let k = 0; k < reach(y); k++) {
      const x = side === 'left' ? k : W - 1 - k
      const t = top(x)
      if (y < t) continue
      const depth = y - t
      let c = '#241a3c'
      if (depth === 0 || depth === 1) c = SNOW
      else if (depth === 2) c = SNOW_SHADE
      else if (depth === 3 && (x * 7) % 5 < 3) c = SNOW_BLUE
      else if (rnd() < 0.05) c = '#33264f'
      else if (rnd() < 0.04) c = '#1a1230'
      l.set(x, y, c)
    }
  }
  return l
}

// Le chalet de bois, comme dans la première capture : toit enneigé, fenêtre éclairée, porte, cheminée.
function cabin() {
  const l = new Layer(40, 34)
  for (let y = 14; y < 34; y++) for (let x = 3; x < 35; x++) l.set(x, y, y % 4 === 0 ? '#5a3322' : '#7a4a30')
  for (let y = 2; y < 14; y++) {
    const half = 5 + (y - 2) * 1.5
    for (let x = Math.round(19 - half); x <= Math.round(19 + half); x++) l.set(x, y, '#4a2a2c')
    l.set(Math.round(19 - half), y, SNOW)
    l.set(Math.round(19 + half), y, SNOW)
    if (y < 5) for (let x = Math.round(19 - half); x <= Math.round(19 + half); x++) l.set(x, y, SNOW)
  }
  for (let y = 12; y < 14; y++) for (let x = 0; x < 40; x++) l.set(x, y, SNOW)
  for (let y = 3; y < 10; y++) for (let x = 27; x < 31; x++) l.set(x, y, '#5a3322')
  for (let x = 26; x < 32; x++) l.set(x, 2, SNOW)
  for (let y = 19; y < 26; y++) for (let x = 22; x < 29; x++) l.set(x, y, '#ffd66a')
  for (let y = 19; y < 26; y++) l.set(25, y, '#3a2218')
  for (let x = 22; x < 29; x++) l.set(x, 22, '#3a2218')
  for (let y = 22; y < 34; y++) for (let x = 9; x < 15; x++) l.set(x, y, '#3a2218')
  l.set(13, 28, '#ffd66a')
  return l
}

// Lampadaire : un poteau sombre, une lanterne jaune.
function lamp() {
  const l = new Layer(7, 42)
  for (let y = 9; y < 42; y++) l.set(3, y, '#1a1426')
  for (let y = 3; y < 9; y++) for (let x = 1; x <= 5; x++) l.set(x, y, '#ffe9a0')
  for (let x = 0; x <= 6; x++) l.set(x, 2, '#1a1426')
  l.set(3, 1, '#1a1426')
  l.set(2, 4, '#fff6d0')
  return l
}

function sign() {
  const l = new Layer(14, 14)
  for (let y = 5; y < 14; y++) l.set(6, y, '#6e4030')
  for (let y = 1; y < 7; y++) for (let x = 1; x < 13; x++) l.set(x, y, y === 1 || y === 6 ? '#5a3322' : '#9a6040')
  l.set(3, 3, '#3a2218')
  l.set(5, 4, '#3a2218')
  l.set(8, 3, '#3a2218')
  return l
}

// Étoiles qui scintillent (blanches, cyan et bleu pâle, comme dans les captures).
function stars(rnd) {
  let out = ''
  const colors = ['#ffffff', '#78e0e8', '#c8d8ff']
  for (let i = 0; i < 70; i++) {
    const x = Math.round(rnd() * W)
    const y = Math.round(rnd() * 112)
    out += `<path class="tw t${i % 3}" style="animation-delay:-${(rnd() * 6).toFixed(1)}s" fill="${colors[i % 3]}" d="M${x} ${y}h1v1h-1z"/>`
  }
  return out
}

// Neige qui tombe en diagonale, par paliers, chaque flocon à son rythme.
function snow(rnd) {
  let out = ''
  for (let i = 0; i < 46; i++) {
    const x = Math.round(rnd() * (W + 20))
    const dur = (7 + rnd() * 8).toFixed(1)
    const lag = -(rnd() * 14).toFixed(1)
    const big = rnd() < 0.25
    out += `<g class="snow" style="animation-duration:${dur}s;animation-delay:${lag}s"><rect x="${x}" y="-6" width="${big ? 2 : 1}" height="${big ? 2 : 1}" fill="#ffffff" opacity="${big ? 0.95 : 0.75}"/></g>`
  }
  return out
}

// ---------- Le parcours de Madeline : double dash de la corniche gauche à la corniche droite, puis retour ----------
const P = 14 // durée du cycle, en secondes
const pct = (t) => ((t / P) * 100).toFixed(3) + '%'
const MIRROR = (x) => 296 - x

// [instant, x, y, nombre de pas jusqu'au point suivant] : les pieds de Madeline, en pixels de la grille.
const PATH = [
  [0, 40, 150, 1],
  [1.5, 40, 150, 8], // saut
  [1.85, 56, 126, 8], // premier dash, en diagonale
  [2.2, 128, 96, 12], // il file
  [2.7, 146, 100, 8], // second dash, à l'horizontale
  [3.05, 218, 100, 12],
  [3.6, 240, 122, 12], // elle retombe
  [4.1, 256, 150, 1], // atterrit sur la corniche droite
  [8.5, 256, 150, 8], // repart vers la gauche
  [8.85, MIRROR(56), 126, 8],
  [9.2, MIRROR(128), 96, 12],
  [9.7, MIRROR(146), 100, 8],
  [10.05, MIRROR(218), 100, 12],
  [10.6, MIRROR(240), 122, 12],
  [11.1, 40, 150, 1],
  [P, 40, 150, 1],
]
const IDLE = [[0, 1.5], [4.1, 8.5], [11.1, P]]
const DASH = [[1.85, 2.2], [2.7, 3.05], [8.85, 9.2], [9.7, 10.05]]
const HAIR = {
  pink: [[0, 1.85], [4.3, 8.85], [11.3, P]],
  white: [[1.85, 2.0], [2.7, 2.85], [8.85, 9.0], [9.7, 9.85]],
  red: [[2.0, 2.7], [9.0, 9.7]],
  cyan: [[2.85, 4.3], [9.85, 11.3]],
}

function inside(intervals, t) {
  return intervals.some(([a, b]) => t >= a - 1e-9 && t < b - 1e-9)
}

// Une piste d'opacité : 1 pendant les intervalles, 0 le reste du temps ; chaque changement est instantané.
function track(name, test) {
  const marks = new Set([0])
  const add = (t) => {
    if (t > 0 && t < P) marks.add(Number(t.toFixed(3)))
  }
  for (const intervals of [IDLE, DASH, ...Object.values(HAIR)]) {
    for (const [from, to] of intervals) {
      add(from)
      add(to)
    }
  }
  const sorted = [...marks].sort((x, y) => x - y)
  return `@keyframes ${name}{${sorted.map((t) => `${pct(t)}{opacity:${test(t + 0.0005) ? 1 : 0}}`).join('')}}`
}

function moveKeyframes() {
  return `@keyframes mv{${PATH.map(([t, x, y, n]) => `${pct(t)}{transform:translate(${x}px,${y}px);animation-timing-function:steps(${n},end)}`).join('')}}`
}

const CSS = `
.mv{animation:mv ${P}s linear infinite}
${moveKeyframes()}
.fl{animation:fl ${P}s steps(1,end) infinite}
@keyframes fl{0%{transform:scaleX(1)}${pct(8.3)}{transform:scaleX(-1)}${pct(13.5)}{transform:scaleX(1)}}
.p-idle{animation:pIdle ${P}s steps(1,end) infinite}
.p-dash{animation:pDash ${P}s steps(1,end) infinite}
.p-air{animation:pAir ${P}s steps(1,end) infinite}
${track('pIdle', (t) => inside(IDLE, t))}
${track('pDash', (t) => inside(DASH, t))}
${track('pAir', (t) => !inside(IDLE, t) && !inside(DASH, t))}
.h-pink{animation:hPink ${P}s steps(1,end) infinite}
.h-white{animation:hWhite ${P}s steps(1,end) infinite}
.h-red{animation:hRed ${P}s steps(1,end) infinite}
.h-cyan{animation:hCyan ${P}s steps(1,end) infinite}
${track('hPink', (t) => inside(HAIR.pink, t))}
${track('hWhite', (t) => inside(HAIR.white, t))}
${track('hRed', (t) => inside(HAIR.red, t))}
${track('hCyan', (t) => inside(HAIR.cyan, t))}
.snow{animation:snow 10s steps(70,end) infinite}
@keyframes snow{from{transform:translate(0,0)}to{transform:translate(-16px,212px)}}
.tw{animation:tw 3s steps(1,end) infinite}
.t1{animation-duration:4.3s}
.t2{animation-duration:2.6s}
@keyframes tw{0%{opacity:1}45%{opacity:.25}70%{opacity:1}}
.lamp{animation:lampGlow 3s steps(1,end) infinite}
@keyframes lampGlow{0%{opacity:1}50%{opacity:.75}}
.win{animation:winGlow 5s steps(1,end) infinite}
@keyframes winGlow{0%{opacity:1}70%{opacity:.8}85%{opacity:1}}
@media (prefers-reduced-motion: reduce){*{animation:none !important}}`

// Madeline à sa place : un déplacement, un retournement, trois poses, quatre couleurs de cheveux.
function madeline(delay, opacity, ghost, at) {
  const lag = at === undefined ? delay : delay - at
  const freeze = at === undefined ? '' : ';animation-play-state:paused'
  const style = ` style="animation-delay:${lag}s${freeze}"`
  const sprite = ghost
    ? '<use href="#m-ghost"/>'
    : madelinePose('idle', 'p-idle') + madelinePose('air', 'p-air') + madelinePose('dash', 'p-dash')
  return `<g class="mv"${style}><g class="fl"${style}><g transform="translate(-8 -16)" opacity="${opacity}">${sprite}</g></g></g>`
}

function halo(cx, cy, r, color) {
  return [[1, 0.06], [0.66, 0.1], [0.36, 0.16]]
    .map(([k, op]) => `<ellipse cx="${cx}" cy="${cy}" rx="${Math.round(r * k)}" ry="${Math.round(r * k)}" fill="${color}" opacity="${op}"/>`)
    .join('')
}

export function celesteSvg(at) {
  const rnd = mulberry32(5)
  const ledgeL = ledge('left', rnd)
  const ledgeR = ledge('right', rnd)
  const house = cabin()
  const post = lamp()
  const board = sign()
  const pinesGap = [86, 100, 114, 128, 140, 152, 166, 178, 192, 206, 220, 232]
    .map((x, i) => `<use href="#pine${i % 3 === 0 ? 'L' : 'M'}" x="${x - 7}" y="${i % 3 === 0 ? 168 : 176}"/>`)
    .join('')
  const pS = pine(11, 20)
  const pM = pine(15, 28)
  const pL = pine(21, 40)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" ` +
    `preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges"><style>${CSS}${at === undefined ? '' : `.p-idle,.p-air,.p-dash,.h-pink,.h-white,.h-red,.h-cyan{animation-delay:-${at}s;animation-play-state:paused}`}</style>` +
    `<defs>${madelineDefs()}<g id="pineS">${pS.svg()}</g><g id="pineM">${pM.svg()}</g><g id="pineL">${pL.svg()}</g></defs>` +
    `<g transform="scale(5)">` +
    bandsSvg('c', SKY, 0, 170) +
    stars(rnd) +
    mountains() +
    `<rect y="150" width="320" height="50" fill="#0b0a22"/>` +
    pinesGap +
    `<rect y="140" width="320" height="30" fill="#3a4aa0" opacity=".1"/>` +
    ledgeL.svg() +
    ledgeR.svg() +
    // Chalet, sapins, lampadaire et panneau sur les corniches.
    `<g class="win">${halo(30, GROUND_Y - 12, 16, '#ffd66a')}</g>` +
    `<g transform="translate(6 ${GROUND_Y - 33})">${house.svg()}</g>` +
    `<use href="#pineL" x="46" y="${GROUND_Y - 38}"/><use href="#pineM" x="62" y="${GROUND_Y - 26}"/>` +
    `<use href="#pineL" x="290" y="${GROUND_Y - 38}"/><use href="#pineM" x="306" y="${GROUND_Y - 26}"/>` +
    `<g class="lamp">${halo(281, GROUND_Y - 36, 20, '#ffd66a')}</g>` +
    `<g transform="translate(278 ${GROUND_Y - 41})">${post.svg()}</g>` +
    `<g transform="translate(250 ${GROUND_Y - 12})">${board.svg()}</g>` +
    // Madeline : d'abord les images fantômes de la traînée du dash, puis elle.
    madeline(0.24, 0.12, true, at) +
    madeline(0.16, 0.22, true, at) +
    madeline(0.1, 0.34, true, at) +
    madeline(0.05, 0.5, true, at) +
    madeline(0, 1, false, at) +
    snow(rnd) +
    `</g></svg>`
  )
}
