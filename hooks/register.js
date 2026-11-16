import { greenpathSvg } from './scenes/greenpath.js'
import { fogCanyonSvg } from './scenes/fogcanyon.js'
import { celesteSvg } from './scenes/celeste.js'

// Les fonds disponibles : le nom de la scène, son dessin, et la "vitre" qui garde le texte lisible par-dessus.
const SCENES = {
  greenpath: {
    title: 'Greenpath',
    scene: greenpathSvg,
    alt: 'Greenpath : une grotte verdoyante en pixel art avec un lac et une cascade',
    glass: { blur: 8, tint: '#07130f', opacity: 0.55 },
  },
  fogcanyon: {
    title: 'Fog Canyon',
    scene: fogCanyonSvg,
    alt: 'Fog Canyon : un canyon de brume violette où des méduses lumineuses montent',
    glass: { blur: 8, tint: '#0a0820', opacity: 0.55 },
  },
  celeste: {
    title: 'Celeste',
    scene: celesteSvg,
    alt: "Celeste : la Cité oubliée de nuit, avec Madeline qui traverse l'écran en double dash",
    glass: { blur: 8, tint: '#0a0a24', opacity: 0.5 },
  },
}
const DEFAULT_SCENE = 'greenpath'

// Pose un fond. Le nom de la scène est donné sous deux noms (scene et id) pour les versions de l'app qui lisent l'un ou l'autre ;
// si l'app refuse cette forme, on retombe sur la forme simple.
async function applyScene($, name) {
  const def = SCENES[name]
  const attempts = [
    { backdrop: { scene: name, id: name, glass: def.glass }, overrideColorScheme: 'dark' },
    { backdrop: { scene: name, glass: def.glass }, overrideColorScheme: 'dark' },
    { backdrop: { scene: name, glass: def.glass } },
  ]
  let lastError
  for (const attempt of attempts) {
    try {
      return await $.theme.set(attempt)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

// État du module (repart de zéro à chaque rechargement) :
// wanted : tant que le fond n'a pas été retiré avec /fond off ; drawn : l'app a confirmé qu'une fenêtre le dessine.
const state = { wanted: true, drawn: false, attempts: 0 }

async function chosen($) {
  const saved = await $.store.get('scene')
  if (saved === 'off') return undefined
  return SCENES[saved] ? saved : DEFAULT_SCENE
}

// Pose le fond voulu, sans jamais faire échouer le démarrage ou l'envoi d'un message.
async function ensure($) {
  try {
    const name = await chosen($)
    state.wanted = name !== undefined
    if (!state.wanted) return
    const set = await applyScene($, name)
    state.drawn = set.isDrawn === true
  } catch (error) {
    state.drawn = false
    void $.ui.status('hugo-themes : ' + String(error))
  }
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'fond',
      description: 'Fond animé : /fond (liste), /fond <nom>, /fond off',
    })
    await ensure($)
    // La fenêtre peut se connecter après le démarrage : on réessaie quelques fois, toutes les 3 secondes.
    $.clock.every(3000, () => {
      if (state.wanted && !state.drawn && state.attempts < 10) {
        state.attempts += 1
        void ensure($)
      }
    })
    return next(e)
  })

  // Après /clear, /resume et /branch, l'app remet le thème à zéro : on repose le fond.
  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    state.attempts = 0
    await ensure($)
    return next(e)
  })

  // À l'envoi d'un message : on repose le fond tant que l'app n'a pas confirmé l'avoir dessiné.
  on('prompt.submit', async ($, e, next) => {
    if (state.wanted && !state.drawn) await ensure($)
    return next(e)
  })

  on('command.run', { command: 'fond' }, async ($, e) => {
    const names = Object.keys(SCENES)
    const arg = e.args.trim().toLowerCase()
    if (!arg) return { text: 'Fonds : ' + names.join(', ') + ' · /fond <nom> pour en choisir un, /fond off pour revenir au thème de base.' }
    if (arg === 'off') {
      state.wanted = false
      state.drawn = false
      await $.store.set('scene', 'off')
      await $.theme.clear()
      return { text: 'Fond retiré : thème de base de Claude Code.' }
    }
    if (!SCENES[arg]) return { text: 'Fond inconnu "' + arg + '". Disponibles : ' + names.join(', ') }
    state.wanted = true
    await $.store.set('scene', arg)
    const set = await applyScene($, arg)
    state.drawn = set.isDrawn === true
    return { text: state.drawn ? 'Fond ' + SCENES[arg].title + ' appliqué.' : 'Fond ' + SCENES[arg].title + ' enregistré (' + set.reason + ')' }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== $.plugin.name) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const def = SCENES[e.props.scene ?? e.props.id]
    if (!def) return next(e)
    const { Svg } = $.ui.resolve(e)
    return Svg({ isInteractive: true, alt: def.alt, source: def.scene() })
  })
}
