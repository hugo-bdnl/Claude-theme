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

async function applyScene($, name) {
  const def = SCENES[name]
  const backdrop = { scene: name, glass: def.glass }
  try {
    return await $.theme.set({ backdrop, overrideColorScheme: 'dark' })
  } catch {
    // Une version qui ne connaît pas overrideColorScheme : on réessaie sans.
    return await $.theme.set({ backdrop })
  }
}

export function register(on) {
  // true tant que le fond n'a pas été retiré avec /fond off
  let wanted = true
  let applied = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'fond',
      description: 'Fond animé : /fond (liste), /fond <nom>, /fond off',
    })
    const saved = await $.store.get('scene')
    if (saved === 'off') wanted = false
    else await applyScene($, SCENES[saved] ? saved : DEFAULT_SCENE)
    return next(e)
  })

  // Dans une session neuve, la fenêtre peut se connecter après : on pose le fond une fois au premier tour.
  on('turn.start', async ($, e, next) => {
    if (wanted && !applied) {
      applied = true
      const saved = await $.store.get('scene')
      await applyScene($, SCENES[saved] ? saved : DEFAULT_SCENE)
    }
    return next(e)
  })

  on('command.run', { command: 'fond' }, async ($, e) => {
    const names = Object.keys(SCENES)
    const arg = e.args.trim().toLowerCase()
    if (!arg) return { text: 'Fonds : ' + names.join(', ') + ' · /fond <nom> pour en choisir un, /fond off pour revenir au thème de base.' }
    if (arg === 'off') {
      wanted = false
      await $.store.set('scene', 'off')
      await $.theme.clear()
      return { text: 'Fond retiré : thème de base de Claude Code.' }
    }
    if (!SCENES[arg]) return { text: 'Fond inconnu "' + arg + '". Disponibles : ' + names.join(', ') }
    wanted = true
    await $.store.set('scene', arg)
    const set = await applyScene($, arg)
    return { text: set.isDrawn ? 'Fond ' + SCENES[arg].title + ' appliqué.' : 'Fond ' + SCENES[arg].title + ' enregistré (' + set.reason + ')' }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== $.plugin.name) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const def = SCENES[e.props.scene]
    if (!def) return next(e)
    const { Svg } = $.ui.resolve(e)
    return Svg({ isInteractive: true, alt: def.title + ' : une grotte verdoyante en pixel art avec un lac', source: def.scene() })
  })
}
