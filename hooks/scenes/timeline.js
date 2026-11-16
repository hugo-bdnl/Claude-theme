// Moteur d'animation de Madeline : on décrit son parcours par une liste de points de passage, et il en tire
// les animations CSS (déplacement par paliers, retournement, pose, couleur des cheveux) et la traînée du dash.
// Un point de passage : { t, x, y, n, pose, hair, flip } — t en secondes, (x, y) les pieds de Madeline sur la grille de 320 x 200,
// n le nombre de pas de pixel jusqu'au point suivant, pose / hair / flip l'état qui dure jusqu'au point suivant.
// Chaîne de caractères pure : pas de DOM, rien d'extérieur, même résultat à chaque appel.

import { POSES, HAIR_COLORS, madelinePose } from './madeline.js'

const HAIRS = Object.keys(HAIR_COLORS)

// Les points de passage d'une course : deux images qui alternent toutes les « step » secondes, à ~90 px/s comme dans le jeu.
export function run(wps, t0, t1, x0, x1, y, flip, hair, step = 0.12) {
  const count = Math.max(1, Math.round((t1 - t0) / step))
  for (let k = 0; k < count; k++) {
    const t = t0 + (k * (t1 - t0)) / count
    const x = x0 + ((x1 - x0) * k) / count
    wps.push({ t, x, y, n: 3, pose: k % 2 ? 'run2' : 'run1', hair, flip })
  }
}

// Construit les animations à partir des points de passage. P est la durée du cycle.
export function timeline(P, wps) {
  const pts = [...wps].sort((a, b) => a.t - b.t)
  const last = pts[pts.length - 1]
  if (last.t < P) pts.push({ ...last, t: P })
  const pct = (t) => ((t / P) * 100).toFixed(3) + '%'
  const states = pts.filter((p, i) => i === 0 || p.t > pts[i - 1].t)
  const mv = states.map((p) => `${pct(p.t)}{transform:translate(${p.x}px,${p.y}px);animation-timing-function:steps(${p.n ?? 1},end)}`).join('')
  const fl = states.map((p) => `${pct(p.t)}{transform:scaleX(${p.flip ? -1 : 1})}`).join('')
  const track = (name, test) => `@keyframes ${name}{${states.map((p) => `${pct(p.t)}{opacity:${test(p) ? 1 : 0}}`).join('')}}`
  let css = `.mv{animation:mv ${P}s linear infinite}@keyframes mv{${mv}}`
  css += `.fl{animation:fl ${P}s steps(1,end) infinite}@keyframes fl{${fl}}`
  for (const name of POSES) css += `.p-${name}{animation:p_${name} ${P}s steps(1,end) infinite}${track('p_' + name, (p) => p.pose === name)}`
  for (const c of HAIRS) css += `.h-${c}{animation:h_${c} ${P}s steps(1,end) infinite}${track('h_' + c, (p) => p.hair === c)}`
  return css
}

// Madeline à sa place : un déplacement, un retournement, huit poses, quatre couleurs de cheveux.
// delay / opacity / ghost servent à la traînée (images fantômes en retard sur Madeline) ; at fige le temps pour les tests.
export function madelineAt(delay, opacity, ghost, at, ghostHref = '#m-ghost') {
  const lag = at === undefined ? delay : delay - at
  const freeze = at === undefined ? '' : ';animation-play-state:paused'
  const style = ` style="animation-delay:${lag}s${freeze}"`
  const sprite = ghost ? `<use href="${ghostHref}"/>` : POSES.map((p) => madelinePose(p, `p-${p}`)).join('')
  return `<g class="mv"${style}><g class="fl"${style}><g transform="translate(-8 -16)" opacity="${opacity}">${sprite}</g></g></g>`
}

// Madeline avec sa traînée de quatre fantômes.
export function madelineWithTrail(at, ghostHref) {
  return madelineAt(0.24, 0.12, true, at, ghostHref) + madelineAt(0.16, 0.22, true, at, ghostHref) + madelineAt(0.1, 0.34, true, at, ghostHref) + madelineAt(0.05, 0.5, true, at, ghostHref) + madelineAt(0, 1, false, at)
}

// En mode test, fige aussi les poses et les couleurs de cheveux à l'instant « at ».
export function freezeCss(at) {
  if (at === undefined) return ''
  const sel = [...POSES.map((p) => `.p-${p}`), ...HAIRS.map((c) => `.h-${c}`)].join(',')
  return `${sel}{animation-delay:-${at}s;animation-play-state:paused}`
}
