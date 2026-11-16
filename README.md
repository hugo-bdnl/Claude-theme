# hugo-themes

Fonds d'écran animés en pixel art pour l'onglet Code de l'app Claude Desktop.

Fond fourni pour l'instant : `greenpath`, une grotte verdoyante avec un lac, des lianes, des lucioles,
un banc et un petit chevalier au masque blanc. Les animations avancent par paliers pour garder l'effet pixel,
et s'arrêtent si le système demande de réduire les animations.

## Installation

Dans une session Claude Code :

    /plugin marketplace add hugo-bdnl/Claude-theme
    /plugin install hugo-themes@hugo-themes

Puis démarrer une nouvelle session locale dans l'onglet Code.

## Utilisation

- `/fond` liste les fonds
- `/fond greenpath` applique un fond (le choix est mémorisé)
- `/fond off` revient au thème de base de Claude Code

## Ajouter un fond

Créer un fichier dans `hooks/scenes/` qui exporte une fonction renvoyant un SVG (voir `greenpath.js`),
puis l'ajouter à `SCENES` dans `hooks/register.js`.
