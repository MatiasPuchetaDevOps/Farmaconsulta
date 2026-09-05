import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
  headings: { fontWeight: '700' },
  colors: {
    // Mismo azul que ya tenía la app (#2563eb), como escala completa para que
    // Mantine pueda usarlo en hover/active/light variants
    blue: [
      '#eef4ff',
      '#dbe7ff',
      '#b8cdff',
      '#8faeff',
      '#6690fd',
      '#3f74f5',
      '#2563eb',
      '#1d4ed8',
      '#1a41b0',
      '#173584',
    ],
  },
  components: {
    Card: {
      defaultProps: { withBorder: true, padding: 'lg' },
    },
    Paper: {
      defaultProps: { withBorder: true },
    },
  },
})
