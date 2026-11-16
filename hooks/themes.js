import { makeColors } from './make-colors.js'

// Pour ajouter un thème : copier un bloc ci-dessous, changer la clé et les couleurs (hex à 6 chiffres).
// Les gris viennent des "anchors" : surface-0 = fond, surface-1/2/3 = cartes/panneaux/menus.
const DEFINITIONS = {
  paper: {
    label: 'Paper',
    roles: { accent: '#2f5d8c', danger: '#b3392f', success: '#4e7d3a', warning: '#a86f14', pro: '#6d4f94' },
    light: {
      gray: {
        anchors: {
          'surface-0': '#efe6d3',
          'surface-1': '#f4ecdc',
          'surface-2': '#faf5e9',
          'text-primary': '#2a241d',
          'text-secondary': '#544a3d',
          'text-muted': '#6a5f50',
        },
      },
    },
    dark: {
      gray: {
        anchors: {
          'surface-0': '#1f1a15',
          'surface-1': '#28221b',
          'surface-2': '#312a22',
          'surface-3': '#3a3229',
          'text-primary': '#f0e7d7',
          'text-secondary': '#cfc4b2',
          'text-muted': '#aca08d',
        },
      },
    },
  },

  midnight: {
    label: 'Midnight',
    roles: { accent: '#3b6fb6', danger: '#c0392b', success: '#3f8a5a', warning: '#a97a1a', pro: '#7a5bb0' },
    light: {
      gray: {
        anchors: {
          'surface-0': '#e8ecf3',
          'surface-1': '#eef1f7',
          'surface-2': '#f5f7fb',
          'text-primary': '#1b2230',
          'text-secondary': '#434d60',
          'text-muted': '#5a6478',
        },
      },
    },
    dark: {
      gray: {
        anchors: {
          'surface-0': '#12161f',
          'surface-1': '#1a202c',
          'surface-2': '#222a38',
          'surface-3': '#2a3344',
          'text-primary': '#e6ebf5',
          'text-secondary': '#b9c2d4',
          'text-muted': '#8f9ab0',
        },
      },
    },
  },

  forest: {
    label: 'Forest',
    roles: { accent: '#3f7d58', danger: '#b5412f', success: '#4a8a3c', warning: '#a87a1a', pro: '#7a5a96' },
    light: {
      gray: {
        anchors: {
          'surface-0': '#e6ebdf',
          'surface-1': '#edf1e7',
          'surface-2': '#f4f7ef',
          'text-primary': '#1d261b',
          'text-secondary': '#43503e',
          'text-muted': '#5a6855',
        },
      },
    },
    dark: {
      gray: {
        anchors: {
          'surface-0': '#141b14',
          'surface-1': '#1b241b',
          'surface-2': '#232d22',
          'surface-3': '#2b362a',
          'text-primary': '#e4ecdf',
          'text-secondary': '#b7c4b1',
          'text-muted': '#92a18c',
        },
      },
    },
  },
}

export const THEMES = {}
export const PROBLEMS = {}

for (const [name, def] of Object.entries(DEFINITIONS)) {
  const { theme, problems } = makeColors(def)
  THEMES[name] = theme
  PROBLEMS[name] = problems
}

export const DEFAULT_THEME = 'paper'
