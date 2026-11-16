import { greenpathSvg } from './scenes/greenpath.js'

// Les fonds disponibles : le nom de la scène, son dessin, et la "vitre" qui garde le texte lisible par-dessus.
const SCENES = {
  greenpath: {
    title: 'Greenpath',
    scene: greenpathSvg,
    glass: { blur: 8, tint: '#07130f', opacity: 0.55 },
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

export function register(on) {
  // true tant que le fond n'a pas été retiré avec /fond off
  let wanted = true
  // true quand l'app a confirmé qu'une fenêtre dessine le fond
  let drawn = false
  let attempts = 0

  async function chosen($) {
    const saved = await $.store.get('scene')
    if (saved === 'off') return undefined
    return SCENES[saved] ? saved : DEFAULT_SCENE
  }

  // Pose le fond voulu, sans jamais faire échouer le démarrage ou l'envoi d'un message.
  async function ensure($) {
    try {
      const name = await chosen($)
      wanted = name !== undefined
      if (!wanted) return
      const set = await applyScene($, name)
      drawn = set.isDrawn === true
    } catch (error) {
      drawn = false
      void $.ui.status('hugo-themes : ' + String(error))
    }
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'fond',
      description: 'Fond animé : /fond (liste), /fond <nom>, /fond off',
    })
    await ensure($)
    // La fenêtre peut se connecter après le démarrage : on réessaie quelques fois, toutes les 3 secondes.
    $.clock.every(3000, () => {
      if (wanted && !drawn && attempts < 10) {
        attempts += 1
        void ensure($)
      }
    })
    return next(e)
  })

  // Après /clear, /resume et /branch, l'app remet le thème à zéro : on repose le fond.
  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    attempts = 0
    await ensure($)
    return next(e)
  })

  // À l'envoi d'un message : on repose le fond tant que l'app n'a pas confirmé l'avoir dessiné.
  on('prompt.submit', async ($, e, next) => {
    if (wanted && !drawn) await ensure($)
    return next(e)
  })

  on('command.run', { command: 'fond' }, async ($, e) => {
    const names = Object.keys(SCENES)
    const arg = e.args.trim().toLowerCase()
    if (!arg) return { text: 'Fonds : ' + names.join(', ') + ' · /fond <nom> pour en choisir un, /fond off pour revenir au thème de base.' }
    if (arg === 'off') {
      wanted = false
      drawn = false
      await $.store.set('scene', 'off')
      await $.theme.clear()
      return { text: 'Fond retiré : thème de base de Claude Code.' }
    }
    if (!SCENES[arg]) return { text: 'Fond inconnu "' + arg + '". Disponibles : ' + names.join(', ') }
    wanted = true
    await $.store.set('scene', arg)
    const set = await applyScene($, arg)
    drawn = set.isDrawn === true
    return { text: drawn ? 'Fond ' + SCENES[arg].title + ' appliqué.' : 'Fond ' + SCENES[arg].title + ' enregistré (' + set.reason + ')' }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== $.plugin.name) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const def = SCENES[e.props.scene ?? e.props.id]
    if (!def) return next(e)
    const { Svg } = $.ui.resolve(e)
    return Svg({ isInteractive: true, alt: def.title + ' : une grotte verdoyante en pixel art avec un lac', source: def.scene() })
  })
}
