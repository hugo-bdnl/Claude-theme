// Mod en cours de construction : les fonds d'écran animés viendront ici.
// En attendant, il remet le thème d'origine de Claude Code à chaque session.
export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.theme.clear()
    return next(e)
  })
}
