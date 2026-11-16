import { THEMES, PROBLEMS, DEFAULT_THEME } from './themes.js'

const names = Object.keys(THEMES)

export function register(on) {
  // Applique le thème mémorisé (ou celui par défaut) à chaque session
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'theme',
      description: 'Changer de thème : /theme <nom>, ou /theme pour la liste',
    })
    const saved = await $.store.get('theme')
    const name = typeof saved === 'string' && THEMES[saved] ? saved : DEFAULT_THEME
    await $.theme.set({ colors: THEMES[name] })
    return next(e)
  })

  on('command.run', { command: 'theme' }, async ($, e) => {
    const wanted = e.args.trim().toLowerCase()
    const current = await $.store.get('theme')
    if (!wanted) {
      return { text: 'Thèmes : ' + names.join(', ') + ' (actuel : ' + (current ?? DEFAULT_THEME) + ')' }
    }
    if (!THEMES[wanted]) {
      return { text: 'Thème inconnu "' + wanted + '". Disponibles : ' + names.join(', ') }
    }
    const set = await $.theme.set({ colors: THEMES[wanted] })
    await $.store.set('theme', wanted)
    const refused = PROBLEMS[wanted].find((line) => line.startsWith("Desktop won't paint"))
    if (refused) return { text: 'Thème ' + wanted + ' refusé par Desktop : ' + refused }
    return { text: set.isDrawn ? 'Thème ' + wanted + ' appliqué.' : 'Thème ' + wanted + ' enregistré (' + set.reason + ')' }
  })
}
