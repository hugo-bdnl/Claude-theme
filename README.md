# hugo-themes

Fonds d'écran animés en pixel art pour l'onglet Code de l'app Claude Desktop.

Fonds fournis :

- `greenpath` : une grotte verdoyante avec un lac, une cascade, des lianes, des lucioles, un banc et un petit chevalier au masque blanc.
- `fogcanyon` : un canyon de brume violette où des méduses lumineuses montent de façon irrégulière.

Les animations avancent par paliers pour garder l'effet pixel, et s'arrêtent si le système demande de réduire les animations.

## Installation

Dans une session Claude Code :

    /plugin marketplace add hugo-bdnl/Claude-theme
    /plugin install hugo-themes@hugo-themes

Puis démarrer une nouvelle session locale dans l'onglet Code.

## Utilisation

- `/fond` liste les fonds
- `/fond greenpath` ou `/fond fogcanyon` applique un fond (le choix est mémorisé)
- `/fond off` revient au thème de base de Claude Code

## Ajouter un fond

Créer un fichier dans `hooks/scenes/` qui exporte une fonction renvoyant un SVG (voir `greenpath.js`),
puis l'ajouter à `SCENES` dans `hooks/register.js`.

## Règles de conception des fonds

- **Rien au centre.** Dans l'app, le chat occupe le centre de la fenêtre et la barre latérale le côté gauche : un sujet placé au milieu est caché.
  Les sujets (personnage, méduses, bulles, lac, cascade, lampadaire…) vont sur les bords (sur la grille de 320 : gauche x < 50, droite x > 255).
  Le centre ne contient que du fond : dégradé, brume, faisceaux de lumière, petites étincelles.
- **Décor discret sur les côtés.** Les rochers et masses sombres restent petits et collés aux coins : ils ne doivent pas manger l'écran.
- **Poids du fichier.** Un fond est un SVG de moins de 131 072 caractères ; viser moins de 110 000.
- `greenpath` date d'avant ces règles (son lac est étendu sur la gauche) et n'a volontairement pas été modifié ; `fogcanyon` les suit.
