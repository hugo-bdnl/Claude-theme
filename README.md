# hugo-themes

Fonds d'écran animés en pixel art pour l'onglet Code de l'app Claude Desktop.

Fonds fournis :

- `greenpath` : une grotte verdoyante avec un lac, une cascade, des lianes, des lucioles, un banc et un petit chevalier au masque blanc.
- `fogcanyon` : un canyon de brume violette où des méduses lumineuses montent de façon irrégulière.
- `celeste` : la Cité oubliée de nuit (jeu Celeste) : montagnes enneigées, chalet, lampadaire, neige qui tombe, et Madeline qui traverse l'écran en double dash d'une corniche à l'autre (cheveux auburn, blancs pendant le dash, cyan sans dash, roses avec deux dashes, comme dans le jeu).

Les animations avancent par paliers pour garder l'effet pixel, et s'arrêtent si le système demande de réduire les animations.

## Installation

Dans une session Claude Code :

    /plugin marketplace add hugo-bdnl/Claude-theme
    /plugin install hugo-themes@hugo-themes

Puis démarrer une nouvelle session locale dans l'onglet Code.

## Utilisation

- `/fond` liste les fonds
- `/fond greenpath`, `/fond fogcanyon` ou `/fond celeste` applique un fond (le choix est mémorisé)
- `/fond off` revient au thème de base de Claude Code

## Ajouter un fond

Créer un fichier dans `hooks/scenes/` qui exporte une fonction renvoyant un SVG (voir `greenpath.js`),
puis l'ajouter à `SCENES` dans `hooks/register.js`.

## Règles de conception des fonds

- **Pas de sujet principal au centre.** Dans l'app, le chat occupe le centre de la fenêtre et la barre latérale le côté gauche : un sujet placé au milieu est caché.
  Les sujets principaux (personnage, grandes méduses, lac, cascade, lampadaire…) vont sur les bords (sur la grille de 320 : gauche x < 50, droite x > 255).
- **Mais pas un centre vide.** Le centre reçoit du décor secondaire, discret et peu contrasté (opacité 30 à 40 %) : silhouettes lointaines pâles
  (petits rochers, troncs), racines au plafond, petites méduses ou bulles éloignées, étincelles, brume, faisceaux de lumière.
- **Décor discret sur les côtés.** Les rochers et masses sombres restent petits et collés aux coins : ils ne doivent pas manger l'écran.
- **Poids du fichier.** Un fond est un SVG de moins de 131 072 caractères ; viser moins de 110 000.
- `greenpath` date d'avant ces règles (son lac est étendu sur la gauche) et n'a volontairement pas été modifié ; `fogcanyon` les suit.

## Sources et droits

Les décors sont des dessins originaux, inspirés de visuels officiels : captures du jeu sur celestegame.com et wiki Celeste pour Celeste
(couleurs de cheveux, vitesse du dash), wiki Hollow Knight pour Greenpath et Fog Canyon. Aucun sprite ni aucune capture du jeu n'est copié :
les personnages sont redessinés pixel par pixel d'après leurs proportions. Hollow Knight est une marque de Team Cherry, Celeste de Maddy Makes Games.
