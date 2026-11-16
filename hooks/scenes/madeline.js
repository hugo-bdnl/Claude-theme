// Madeline (Celeste), redessinée en pixel art : dessin original d'après ses proportions dans le jeu
// (cheveux auburn avec une mèche et une queue, visage clair, veste brun-rouge, écharpe et manches bleues,
// sac à dos gris-bleu, petites bottes). Trois poses : au sol, en l'air, en plein dash.
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

// Au sol, de profil vers la droite : la queue de cheveux part vers la gauche.
function idle() {
  const body = new Layer(16, 16)
  const hair = new Layer(16, 16)
  rect(hair, 5, 2, 10, 2, HL)
  rect(hair, 4, 3, 11, 3, HL)
  rect(hair, 3, 4, 11, 4, HL)
  rect(hair, 2, 5, 8, 5, HL)
  rect(hair, 2, 6, 6, 6, HL)
  rect(hair, 3, 7, 5, 7, HL)
  rect(hair, 3, 8, 4, 8, HL)
  for (const [x, y] of [[6, 3], [9, 4], [7, 4], [4, 6], [3, 5], [5, 7]]) hair.set(x, y, HD)
  rect(body, 9, 5, 11, 5, SKIN)
  rect(body, 7, 6, 11, 6, SKIN)
  rect(body, 8, 7, 10, 7, SKIN)
  body.set(9, 7, SKIN_D)
  body.set(10, 6, OUTLINE)
  rect(body, 7, 8, 10, 8, BLUE_D)
  rect(body, 5, 9, 10, 11, JACKET)
  rect(body, 7, 9, 9, 9, BLUE)
  rect(body, 7, 10, 8, 10, BLUE)
  body.set(4, 11, SKIN_D)
  body.set(11, 11, SKIN_D)
  rect(body, 3, 9, 4, 10, BAG)
  rect(body, 5, 12, 10, 12, JACKET_D)
  rect(body, 6, 13, 7, 13, PANTS)
  rect(body, 9, 13, 10, 13, PANTS)
  rect(body, 6, 14, 7, 14, JACKET)
  rect(body, 9, 14, 10, 14, JACKET)
  rect(body, 6, 15, 7, 15, SKIN_D)
  rect(body, 9, 15, 10, 15, SKIN_D)
  return finish(body, hair)
}

// En l'air : bras levés, jambes écartées, cheveux qui remontent.
function air() {
  const body = new Layer(16, 16)
  const hair = new Layer(16, 16)
  rect(hair, 5, 2, 10, 2, HL)
  rect(hair, 4, 3, 11, 3, HL)
  rect(hair, 3, 4, 11, 4, HL)
  rect(hair, 2, 5, 8, 5, HL)
  rect(hair, 1, 3, 3, 3, HL)
  rect(hair, 0, 2, 2, 2, HL)
  rect(hair, 2, 6, 5, 6, HL)
  for (const [x, y] of [[6, 3], [9, 4], [7, 4], [3, 5], [1, 3]]) hair.set(x, y, HD)
  rect(body, 9, 5, 11, 5, SKIN)
  rect(body, 7, 6, 11, 6, SKIN)
  rect(body, 8, 7, 10, 7, SKIN)
  body.set(10, 6, OUTLINE)
  rect(body, 7, 8, 10, 8, BLUE_D)
  rect(body, 5, 9, 10, 11, JACKET)
  rect(body, 7, 9, 9, 9, BLUE)
  rect(body, 4, 7, 4, 9, SKIN_D)
  rect(body, 11, 7, 11, 9, SKIN_D)
  rect(body, 3, 10, 4, 11, BAG)
  rect(body, 5, 12, 10, 12, JACKET_D)
  rect(body, 4, 13, 5, 13, PANTS)
  rect(body, 10, 13, 11, 13, PANTS)
  rect(body, 3, 14, 4, 14, JACKET)
  rect(body, 11, 14, 12, 14, JACKET)
  return finish(body, hair)
}

// En plein dash : le corps penché vers l'avant, un bras tendu sous le visage, les cheveux qui filent derrière.
function dash() {
  const body = new Layer(16, 16)
  const hair = new Layer(16, 16)
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
  return finish(body, hair)
}

// Les définitions (à mettre dans <defs>) : pour chaque pose, le corps, les cheveux, et une silhouette claire pour la traînée du dash.
export function madelineDefs() {
  let defs = ''
  for (const [name, make] of [['idle', idle], ['air', air], ['dash', dash]]) {
    const s = make()
    const hairSvg = s.hair
      .svg()
      .split(`fill="${HL}"`)
      .join('fill="currentColor"')
      .split(`fill="${HD}"`)
      .join('style="fill:var(--hd)"')
    defs += `<g id="m-${name}-b">${s.body.svg()}</g><g id="m-${name}-h">${hairSvg}</g>`
    if (name === 'idle') {
      const sil = new Layer(16, 16)
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (s.silhouette.get(x, y)) sil.set(x, y, '#cfeaff')
      defs += `<g id="m-ghost">${sil.svg()}</g>`
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
