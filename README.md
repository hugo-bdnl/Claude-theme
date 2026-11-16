# hugo-themes

Plusieurs thèmes de couleurs (clair et sombre) pour l'onglet Code de l'app Claude Desktop.
Le thème choisi est mémorisé et réappliqué à chaque nouvelle session.

## Installation

Dans une session Claude Code :

    /plugin marketplace add hugo-bdnl/Claude-theme
    /plugin install hugo-themes@hugo-themes

Puis démarrer une nouvelle session locale dans l'onglet Code.

## Utilisation

- `/theme` liste les thèmes disponibles
- `/theme midnight` applique un thème

Thèmes fournis : `paper`, `midnight`, `forest`. Le thème par défaut est `paper`.

## Ajouter un thème

Copier un bloc dans `hooks/themes.js`, changer son nom et ses couleurs hex, puis relancer une session.
Les fichiers `hooks/make-colors.js` et `.d.ts` viennent de Claude Code : ne pas les modifier.
