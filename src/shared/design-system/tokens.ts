// OMT Brand Design Tokens
export const designTokens = {
  // OMT Brand Colors
  colors: {
    // Primary brand colors from the kit
    primary: {
      50: '#f8f7f5',   // Lightest cream
      100: '#f0ede6',  // Light cream
      200: '#ebe5d9',  // Brand cream (#EBE5D9)
      300: '#e0d6c5',  // Slightly darker cream
      400: '#d1c4a8',  // Medium cream
      500: '#b8a888',  // Darker cream
      600: '#9d8c6b',  // Bronze
      700: '#7d6e52',  // Dark bronze
      800: '#5c5142',  // Very dark cream
      900: '#3d3630',  // Almost charcoal
      950: '#282927',  // Brand charcoal (#282927)
    },
    
    // Secondary teal from the kit
    secondary: {
      50: '#f0f9fb',   // Lightest teal
      100: '#daeff5',  // Light teal
      200: '#b7e1eb',  // Medium light teal
      300: '#87ccdb',  // Brand light teal (#2BEC3 area)
      400: '#4faec4',  // Medium teal
      500: '#3592aa',  // Darker teal
      600: '#2f7a8f',  // Dark teal
      700: '#264854',  // Brand dark teal (#264854)
      800: '#1e3a43',  // Very dark teal
      900: '#182f35',  // Almost black teal
      950: '#0f1f24',  // Darkest teal
    },
    
    // Accent colors from the kit
    accent: {
      50: '#fefdf8',   // Lightest gold
      100: '#fdf9e8',  // Light gold
      200: '#faf0c2',  // Medium light gold
      300: '#f4e288',  // Light gold
      400: '#edc94a',  // Medium gold
      500: '#d4b138',  // Darker gold
      600: '#ad915a',  // Brand gold (#AD915A)
      700: '#8a7347',  // Dark gold
      800: '#6b5937',  // Very dark gold
      900: '#4f4329',  // Almost black gold
      950: '#2d241a',  // Darkest gold
    },
    
    // Neutral grays based on brand charcoal
    neutral: {
      0: '#ffffff',    // Pure white
      50: '#fafafa',   // Lightest gray
      100: '#f5f5f4',  // Light gray
      200: '#e7e5e4',  // Medium light gray
      300: '#d6d3d1',  // Medium gray
      400: '#a8a29e',  // Darker gray
      500: '#78716c',  // Dark gray
      600: '#57534e',  // Very dark gray
      700: '#44403c',  // Almost charcoal
      800: '#2c2a28',  // Near brand charcoal
      900: '#1c1b1a',  // Very dark
      950: '#070707',  // Brand pure black (#070707)
    },
    
    // System colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    
    warning: {
      50: '#fefdf8',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    
    info: {
      50: '#f0f9fb',
      100: '#daeff5',
      200: '#b7e1eb',
      300: '#87ccdb',
      400: '#4faec4',
      500: '#3592aa',
      600: '#2f7a8f',
      700: '#264854',
      800: '#1e3a43',
      900: '#182f35',
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      serif: ['GT Flexa Var', 'Georgia', 'serif'], // Brand font
      mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900', // For "INDIVISIBLE BLACK"
    },
  },
  
  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  
  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  
  // Shadows
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  
  // Animations
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    timing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
} as const; 