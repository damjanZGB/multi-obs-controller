import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true
};

const theme = extendTheme({
  config,
  fonts: {
    heading: "'Cantarell', 'Inter', sans-serif",
    body: "'Cantarell', 'Inter', sans-serif"
  },
  colors: {
    brand: {
      50: '#e6f1ff',
      100: '#c4d9ff',
      200: '#9dbfff',
      300: '#74a5ff',
      400: '#4d8bfd',
      500: '#3584e4',
      600: '#2a69ba',
      700: '#1f4f90',
      800: '#153666',
      900: '#0b1d3d'
    },
    status: {
      connected: '#5b8def',
      offline: '#9ea1aa',
      error: '#f28f8a'
    }
  },
  semanticTokens: {
    colors: {
      'bg.canvas': { default: '#f6f5f4', _dark: '#1e1e24' },
      'bg.surface': { default: '#ffffff', _dark: '#25262c' },
      'bg.surfaceAlt': { default: '#ebe9e8', _dark: '#2f3036' },
      'border.subtle': { default: '#d8d7d5', _dark: '#3b3c44' },
      'border.focused': { default: '#3584e4', _dark: '#62a0ea' },
      'fg.default': { default: '#241f31', _dark: '#f6f5f4' },
      'fg.muted': { default: '#5e5c64', _dark: '#d0d3da' },
      'fg.subtle': { default: '#77767b', _dark: '#abaeb7' },
      'accent.soft': { default: 'rgba(53, 132, 228, 0.12)', _dark: 'rgba(98, 160, 234, 0.16)' },
      'card.connected.bg': { default: '#e7eefc', _dark: 'rgba(98, 160, 234, 0.22)' },
      'card.connected.border': { default: '#b8caf7', _dark: '#5575c5' },
      'card.connected.overlay': { default: 'rgba(53, 132, 228, 0.12)', _dark: 'rgba(98, 160, 234, 0.18)' },
      'card.offline.bg': { default: '#f3f3f5', _dark: '#2f3036' },
      'card.offline.border': { default: '#d5d6da', _dark: '#3f4048' },
      'card.offline.overlay': { default: 'rgba(130, 132, 140, 0.08)', _dark: 'rgba(151, 153, 162, 0.16)' },
      'card.error.bg': { default: '#fdeceb', _dark: 'rgba(250, 169, 160, 0.22)' },
      'card.error.border': { default: '#f4b8b2', _dark: '#e26d69' },
      'card.error.overlay': { default: 'rgba(251, 154, 146, 0.18)', _dark: 'rgba(235, 107, 102, 0.22)' }
    },
    radii: {
      surface: { default: '18px', _dark: '18px' }
    },
    shadows: {
      surface: {
        default: '0 18px 45px rgba(36, 31, 49, 0.12)',
        _dark: '0 16px 42px rgba(0, 0, 0, 0.55)'
      }
    }
  },
  styles: {
    global: {
      body: {
        bg: 'bg.canvas',
        color: 'fg.default'
      }
    }
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: '999px',
        fontWeight: 600
      }
    },
    Tooltip: {
      baseStyle: {
        borderRadius: 'md',
        bg: 'bg.surfaceAlt',
        color: 'fg.default',
        px: 3,
        py: 2,
        boxShadow: 'surface'
      }
    },
    Drawer: {
      baseStyle: {
        dialog: {
          bg: 'bg.surface'
        }
      }
    }
  },
  shadows: {
    outline: '0 0 0 3px rgba(98, 160, 234, 0.45)'
  }
});

export default theme;
