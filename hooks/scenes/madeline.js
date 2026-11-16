// Madeline (Celeste), redessinée en pixel art : dessin original d'après ses proportions dans le jeu
// (cheveux auburn avec une mèche et une queue, visage clair, veste brun-rouge, écharpe et manches bleues,
// sac à dos gris-bleu, petites bottes). Huit poses : au sol, deux images de course, en l'air, en chute,
// en dash, accroupie (dash vers le sol, hyperdash) et accrochée à un mur.
// Les cheveux sont à part du corps, pour changer de couleur selon le nombre de dashes
// (couleurs du jeu : auburn 1 dash, cyan 0 dash, rose 2 dashes, blanc pendant le dash).
// Les cheveux utilisent currentColor (clair) et var(--hd) (ombre) : la couleur se choisit sur le <use>.
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.

import { Layer, outlineOf } from './pixel.js'

const HL = '#010101' // repère : cheveux clairs
const HD = '#020202' // repère : cheveux sombres
const SKIN = '#f8d4b0'
const SKIN_D = '#e3b27c'
const JACKET = '#8c3a30'
const JACKET_D = '#5e2a2e'
const BLUE = '#6a7cff'
const BLUE_D = '#4a54b0'
const BAG = '#6b80a0'
const PANTS = '#4a3050'
const OUTLINE = '#1b1030'

export const HAIR_COLORS = {
  red: { light: '#ac3232', dark: '#6e1f2b' },
  cyan: { light: '#44b7ff', dark: '#2a7ab8' },
  pink: { light: '#ff6def', dark: '#b84aa8' },
  white: { light: '#ffffff', dark: '#c8d0e0' },
}
export const POSES = ['idle', 'run1', 'run2', 'air', 'fall', 'dash', 'duck', 'wall', 'star']

const rect = (l, x0, y0, x1, y1, c) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) l.set(x, y, c)
}

// Contour automatique autour du corps et des cheveux réunis.
function finish(body, hair) {
  const all = new Layer(body.w, body.h)
  for (let y = 0; y < body.h; y++) {
    for (let x = 0; x < body.w; x++) {
      const c = body.get(x, y) ?? hair.get(x, y)
      if (c) all.set(x, y, c)
    }
  }
  const edge = outlineOf(all, OUTLINE)
  for (let y = 0; y < body.h; y++) for (let x = 0; x < body.w; x++) if (edge.get(x, y) && !body.get(x, y)) body.set(x, y, OUTLINE)
  return { body, hair, silhouette: all }
}

// La tête et les cheveux, décalés de dy ; la queue de cheveux prend la forme de « tail ».
function drawHead(body, hair, dy, tail) {
  rect(hair, 5, 2 + dy, 10, 2 + dy, HL)
  rect(hair, 4, 3 + dy, 11, 3 + dy, HL)
  rect(hair, 3, 4 + dy, 11, 4 + dy, HL)
  if (tail === 'rest') {
    rect(hair, 2, 5 + dy, 8, 5 + dy, HL)
    rect(hair, 2, 6 + dy, 6, 6 + dy, HL)
    rect(hair, 3, 7 + dy, 5, 7 + dy, HL)
    rect(hair, 3, 8 + dy, 4, 8 + dy, HL)
  } else if (tail === 'up') {
    rect(hair, 2, 5 + dy, 8, 5 + dy, HL)
    rect(hair, 1, 3 + dy, 3, 3 + dy, HL)
    rect(hair, 0, 2 + dy, 2, 2 + dy, HL)
    rect(hair, 2, 6 + dy, 5, 6 + dy, HL)
  } else if (tail === 'back') {
    rect(hair, 0, 5 + dy, 8, 5 + dy, HL)
    rect(hair, 0, 4 + dy, 2, 4 + dy, HL)
    rect(hair, 1, 6 + dy, 6, 6 + dy, HL)
    rect(hair, 0, 7 + dy, 4, 7 + dy, HL)
  } else {
    rect(hair, 2, 5 + dy, 8, 5 + dy, HL)
    rect(hair, 2, 6 + dy, 5, 6 + dy, HL)
    rect(hair, 3, 7 + dy, 5, 7 + dy, HL)
    rect(hair, 3, 8 + dy, 5, 9 + dy, HL)
  }
  for (const [x, y] of [[6, 3], [9, 4], [7, 4], [4, 6], [3, 5], [5, 7]]) if (hair.get(x, y + dy) === HL) hair.set(x, y + dy, HD)
  rect(body, 9, 5 + dy, 11, 5 + dy, SKIN)
  rect(body, 7, 6 + dy, 11, 6 + dy, SKIN)
  rect(body, 8, 7 + dy, 10, 7 + dy, SKIN)
  body.set(9, 7 + dy, SKIN_D)
  body.set(10, 6 + dy, OUTLINE)
}

// Le torse, avec les bras dans la position voulue.
function drawTorso(body, dy, arms, skirt = true) {
  rect(body, 7, 8 + dy, 10, 8 + dy, BLUE_D)
  rect(body, 5, 9 + dy, 10, 11 + dy, JACKET)
  rect(body, 7, 9 + dy, 9, 9 + dy, BLUE)
  rect(body, 7, 10 + dy, 8, 10 + dy, BLUE)
  rect(body, 3, 9 + dy, 4, 10 + dy, BAG)
  if (skirt) rect(body, 5, 12 + dy, 10, 12 + dy, JACKET_D)
  if (arms === 'down') {
    body.set(4, 11 + dy, SKIN_D)
    body.set(11, 11 + dy, SKIN_D)
  } else if (arms === 'up') {
    rect(body, 4, 7 + dy, 4, 9 + dy, SKIN_D)
    rect(body, 11, 7 + dy, 11, 9 + dy, SKIN_D)
  } else if (arms === 'forward') {
    rect(body, 11, 9 + dy, 14, 9 + dy, SKIN_D)
    rect(body, 11, 10 + dy, 12, 10 + dy, JACKET_D)
    body.set(4, 11 + dy, SKIN_D)
  } else if (arms === 'wall') {
    rect(body, 11, 5 + dy, 12, 9 + dy, SKIN_D)
    body.set(4, 11 + dy, SKIN_D)
  } else if (arms === 'swing') {
    body.set(4, 10 + dy, SKIN_D)
    body.set(12, 11 + dy, SKIN_D)
  }
}

function drawLegs(body, kind) {
  const standing = () => {
    rect(body, 6, 13, 7, 13, PANTS)
    rect(body, 9, 13, 10, 13, PANTS)
    rect(body, 6, 14, 7, 14, JACKET)
    rect(body, 9, 14, 10, 14, JACKET)
    rect(body, 6, 15, 7, 15, SKIN_D)
    rect(body, 9, 15, 10, 15, SKIN_D)
  }
  if (kind === 'stand') standing()
  else if (kind === 'runA') {
    rect(body, 5, 13, 6, 13, PANTS)
    rect(body, 4, 14, 5, 14, JACKET)
    rect(body, 4, 15, 5, 15, SKIN_D)
    rect(body, 9, 13, 11, 13, PANTS)
    rect(body, 10, 14, 11, 14, JACKET)
    rect(body, 11, 15, 12, 15, SKIN_D)
  } else if (kind === 'runB') {
    rect(body, 7, 13, 8, 13, PANTS)
    rect(body, 7, 14, 8, 14, JACKET)
    rect(body, 7, 15, 8, 15, SKIN_D)
    rect(body, 9, 13, 10, 13, PANTS)
    rect(body, 9, 14, 10, 14, JACKET)
    rect(body, 10, 15, 11, 15, SKIN_D)
  } else if (kind === 'air') {
    rect(body, 4, 13, 5, 13, PANTS)
    rect(body, 10, 13, 11, 13, PANTS)
    rect(body, 3, 14, 4, 14, JACKET)
    rect(body, 11, 14, 12, 14, JACKET)
  } else if (kind === 'fall') {
    rect(body, 5, 13, 6, 13, PANTS)
    rect(body, 9, 13, 10, 13, PANTS)
    rect(body, 4, 14, 5, 14, JACKET)
    rect(body, 10, 14, 11, 14, JACKET)
    body.set(4, 15, SKIN_D)
    body.set(11, 15, SKIN_D)
  } else if (kind === 'duck') {
    rect(body, 5, 15, 6, 15, JACKET)
    rect(body, 9, 15, 11, 15, JACKET)
  } else if (kind === 'wall') {
    rect(body, 8, 13, 9, 13, PANTS)
    rect(body, 11, 13, 12, 14, PANTS)
    rect(body, 12, 13, 13, 14, JACKET)
    rect(body, 8, 14, 9, 14, JACKET)
  }
}

// Le vol de plume : Madeline devient une étoile jaune lumineuse qui file librement.
function star() {
  const body = new Layer(16, 16)
  const hair = new Layer(16, 16)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = Math.abs(x - 7.5)
      const dy = Math.abs(y - 7.5)
      const d = dx + dy
      if (d <= 2.5) body.set(x, y, '#fffbe0')
      else if (d <= 4.5) body.set(x, y, '#ffe060')
      else if ((dx < 1.6 && dy <= 7) || (dy < 1.6 && dx <= 7)) body.set(x, y, dx < 1 || dy < 1 ? '#ffd040' : '#e8a820')
    }
  }
  return { body, hair, silhouette: body }
}

function pose(name) {
  if (name === 'star') return star()
  const body = new Layer(16, 16)
  const hair = new Layer(16, 16)
  if (name === 'idle') {
    drawHead(body, hair, 0, 'rest')
    drawTorso(body, 0, 'down')
    drawLegs(body, 'stand')
  } else if (name === 'run1') {
    drawHead(body, hair, 0, 'back')
    drawTorso(body, 0, 'swing')
    drawLegs(body, 'runA')
  } else if (name === 'run2') {
    drawHead(body, hair, 0, 'back')
    drawTorso(body, 0, 'swing')
    drawLegs(body, 'runB')
  } else if (name === 'air') {
    drawHead(body, hair, 0, 'up')
    drawTorso(body, 0, 'up')
    drawLegs(body, 'air')
  } else if (name === 'fall') {
    drawHead(body, hair, 0, 'up')
    drawTorso(body, 0, 'up')
    drawLegs(body, 'fall')
  } else if (name === 'dash') {
    // Le corps penché vers l'avant, un bras tendu sous le visage, les cheveux qui filent derrière.
    rect(hair, 0, 5, 9, 5, HL)
    rect(hair, 1, 6, 9, 6, HL)
    rect(hair, 4, 4, 11, 4, HL)
    rect(hair, 6, 3, 10, 3, HL)
    rect(hair, 0, 7, 6, 7, HL)
    for (const [x, y] of [[3, 5], [7, 5], [9, 4], [2, 6], [5, 7]]) hair.set(x, y, HD)
    rect(body, 10, 5, 12, 5, SKIN)
    rect(body, 10, 6, 12, 6, SKIN)
    rect(body, 9, 7, 11, 7, SKIN)
    body.set(12, 6, OUTLINE)
    rect(body, 7, 7, 8, 7, BLUE_D)
    rect(body, 4, 8, 10, 10, JACKET)
    rect(body, 6, 8, 8, 8, BLUE)
    rect(body, 11, 9, 14, 9, SKIN_D)
    rect(body, 11, 10, 12, 10, JACKET_D)
    rect(body, 2, 8, 3, 9, BAG)
    rect(body, 4, 11, 8, 11, JACKET_D)
    rect(body, 1, 10, 3, 11, PANTS)
    rect(body, 0, 11, 1, 12, JACKET)
    rect(body, 5, 12, 7, 12, PANTS)
    rect(body, 4, 13, 5, 13, JACKET)
  } else if (name === 'duck') {
    // Accroupie, un bras tendu devant : le dash vers le sol et le départ d'un hyperdash.
    drawHead(body, hair, 3, 'back')
    drawTorso(body, 3, 'forward', false)
    drawLegs(body, 'duck')
  } else if (name === 'wall') {
    // Accrochée à un mur à sa droite : une main en haut, les pieds contre le mur.
    drawHead(body, hair, 0, 'rest')
    drawTorso(body, 0, 'wall')
    drawLegs(body, 'wall')
  }
  return finish(body, hair)
}

// Les définitions (à mettre dans <defs>) : pour chaque pose, le corps et les cheveux, plus une silhouette claire pour la traînée du dash.
export function madelineDefs() {
  let defs = ''
  for (const name of POSES) {
    const s = pose(name)
    const hairSvg = s.hair
      .svg()
      .split(`fill="${HL}"`)
      .join('fill="currentColor"')
      .split(`fill="${HD}"`)
      .join('style="fill:var(--hd)"')
    defs += `<g id="m-${name}-b">${s.body.svg()}</g><g id="m-${name}-h">${hairSvg}</g>`
    if (name === 'idle') {
      const sil = new Layer(16, 16)
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (s.silhouette.get(x, y)) sil.set(x, y, '#2a6aa8')
      defs += `<g id="m-ghost">${sil.svg()}</g>`
      const dot = new Layer(16, 16)
      for (const [x, y] of [[7, 7], [8, 7], [7, 8], [8, 8], [6, 7], [9, 7], [6, 8], [9, 8], [7, 6], [8, 6], [7, 9], [8, 9]]) dot.set(x, y, '#ffe060')
      defs += `<g id="m-ghost-star">${dot.svg()}</g>`
    }
  }
  return defs
}

// Une pose : le corps, et les quatre couleurs de cheveux (une seule visible à la fois, par animation).
export function madelinePose(name, cls) {
  let hairs = ''
  for (const [key, c] of Object.entries(HAIR_COLORS)) {
    hairs += `<g class="h-${key}"><use href="#m-${name}-h" style="color:${c.light};--hd:${c.dark}"/></g>`
  }
  return `<g class="${cls}"><use href="#m-${name}-b"/>${hairs}</g>`
}
