/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand colors from OMT kit
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
      
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['GT Flexa Var', 'Georgia', 'serif'], // Brand font
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
      },
      
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
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
      
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'sidebar': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'dark-card': '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
        'dark-card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'theme-transition': 'themeTransition 0.3s ease-in-out',
        // Additional animations for Radix UI components
        'accordion-down': 'accordionDown 0.2s ease-out',
        'accordion-up': 'accordionUp 0.2s ease-out',
        'collapsible-down': 'collapsibleDown 0.2s ease-out',
        'collapsible-up': 'collapsibleUp 0.2s ease-out',
        'toast-slide-in': 'toastSlideIn 0.15s ease-out',
        'toast-slide-out': 'toastSlideOut 0.15s ease-in',
        'dialog-overlay-show': 'dialogOverlayShow 0.15s ease-out',
        'dialog-content-show': 'dialogContentShow 0.15s ease-out',
        'dropdown-content-show': 'dropdownContentShow 0.15s ease-out',
        'tooltip-show': 'tooltipShow 0.15s ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        themeTransition: {
          '0%': { opacity: '0.8' },
          '100%': { opacity: '1' },
        },
        // Additional keyframes for Radix UI components
        accordionDown: {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        accordionUp: {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        collapsibleDown: {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        collapsibleUp: {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
        toastSlideIn: {
          from: { transform: 'translateX(calc(100% + 1rem))' },
          to: { transform: 'translateX(0)' },
        },
        toastSlideOut: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(calc(100% + 1rem))' },
        },
        dialogOverlayShow: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        dialogContentShow: {
          from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        dropdownContentShow: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        tooltipShow: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      
      backdropBlur: {
        xs: '2px',
      },
      
      transitionProperty: {
        'theme': 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Plugin to add Radix UI data attribute variants
    function ({ addVariant }) {
      addVariant('state-open', '&[data-state="open"]');
      addVariant('state-closed', '&[data-state="closed"]');
      addVariant('state-on', '&[data-state="on"]');
      addVariant('state-checked', '&[data-state="checked"]');
      addVariant('state-unchecked', '&[data-state="unchecked"]');
      addVariant('state-active', '&[data-state="active"]');
      addVariant('state-inactive', '&[data-state="inactive"]');
      addVariant('state-highlighted', '&[data-highlighted]');
      addVariant('state-selected', '&[data-selected]');
      addVariant('side-top', '&[data-side="top"]');
      addVariant('side-right', '&[data-side="right"]');
      addVariant('side-bottom', '&[data-side="bottom"]');
      addVariant('side-left', '&[data-side="left"]');
      addVariant('align-start', '&[data-align="start"]');
      addVariant('align-center', '&[data-align="center"]');
      addVariant('align-end', '&[data-align="end"]');
      addVariant('orientation-horizontal', '&[data-orientation="horizontal"]');
      addVariant('orientation-vertical', '&[data-orientation="vertical"]');
    }
  ],
};
