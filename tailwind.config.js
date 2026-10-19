import forms from '@tailwindcss/forms'
import containerQueries from '@tailwindcss/container-queries'

// Thème "Executive Precision" (Material 3) partagé par les écrans de l'administration,
// complété par les palettes `brand` (Statistiques) et `bim` (Portefeuilles).
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  // `relative` : chemins résolus depuis ce fichier, quel que soit le dossier où Vite est lancé.
  content: {
    relative: true,
    files: ['./index.html', './src/**/*.{vue,js}']
  },
  theme: {
    extend: {
      colors: {
        'inverse-primary': '#b8c4ff',
        'on-secondary-fixed': '#131b2e',
        'on-primary': '#ffffff',
        outline: '#757684',
        'surface-tint': '#3755c3',
        'tertiary-fixed': '#ffdada',
        'primary-fixed': '#dde1ff',
        'on-secondary': '#ffffff',
        'surface-dim': '#cbdbf5',
        'surface-variant': '#d3e4fe',
        'on-tertiary-fixed': '#40000c',
        'on-surface-variant': '#444653',
        'on-tertiary-fixed-variant': '#920028',
        'outline-variant': '#c4c5d5',
        'tertiary-container': '#9a002b',
        'inverse-surface': '#213145',
        secondary: '#565e74',
        'on-secondary-container': '#5c647a',
        'on-tertiary-container': '#ffa2a7',
        'on-primary-container': '#a8b8ff',
        'surface-bright': '#f8f9ff',
        'secondary-container': '#dae2fd',
        'on-error': '#ffffff',
        'primary-fixed-dim': '#b8c4ff',
        'on-background': '#0b1c30',
        'on-surface': '#0b1c30',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f6fe',
        'on-primary-fixed-variant': '#173bab',
        'on-secondary-fixed-variant': '#3f465c',
        'on-primary-fixed': '#001453',
        'primary-container': '#1e40af',
        'tertiary-fixed-dim': '#ffb3b6',
        'inverse-on-surface': '#eaf1ff',
        background: '#f8f9ff',
        'surface-container': '#eaf0fc',
        surface: '#fbfcff',
        'surface-card': '#ffffff',
        'surface-container-high': '#e1e9fb',
        error: '#ba1a1a',
        'surface-container-highest': '#d3e4fe',
        'secondary-fixed-dim': '#bec6e0',
        tertiary: '#6f001c',
        'on-tertiary': '#ffffff',
        'secondary-fixed': '#dae2fd',
        'error-container': '#ffdad6',
        primary: '#00288e',
        'on-error-container': '#93000a',
        brand: {
          50: '#eff4ff',
          100: '#dbe7fe',
          200: '#bfd5fe',
          500: '#1d4ed8',
          600: '#1e40af',
          700: '#1e3a8a',
          800: '#172554',
          900: '#0f172a'
        },
        bim: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554'
        }
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        gutter: '1.25rem',
        margin: '1.5rem'
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'display-lg': ['Inter'],
        'headline-lg': ['Inter'],
        'headline-md': ['Inter'],
        'headline-sm': ['Inter'],
        'numeric-kpi': ['Inter'],
        'label-md': ['Inter'],
        'label-sm': ['Inter'],
        'body-lg': ['Inter'],
        'body-md': ['Inter'],
        'body-sm': ['Inter']
      },
      fontSize: {
        'display-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['16px', { lineHeight: '24px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'numeric-kpi': ['28px', { lineHeight: '36px', letterSpacing: '-0.025em', fontWeight: '700' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }]
      },
      // Ombres douces et superposées pour toutes les cartes.
      boxShadow: {
        // Reflet blanc en haut (effet verre) + liseré fin + ombre diffuse teintée du bleu de la marque.
        sm: 'inset 0 1px 0 0 rgb(255 255 255 / 0.85), 0 0 0 1px rgb(30 58 138 / 0.06), 0 1px 2px 0 rgb(15 23 42 / 0.04), 0 6px 16px -6px rgb(30 64 175 / 0.08)',
        DEFAULT: 'inset 0 1px 0 0 rgb(255 255 255 / 0.85), 0 0 0 1px rgb(30 58 138 / 0.06), 0 2px 4px -1px rgb(15 23 42 / 0.05), 0 10px 24px -8px rgb(30 64 175 / 0.12)',
        md: 'inset 0 1px 0 0 rgb(255 255 255 / 0.9), 0 0 0 1px rgb(30 58 138 / 0.07), 0 2px 4px -1px rgb(15 23 42 / 0.05), 0 16px 36px -12px rgb(30 64 175 / 0.20)',
        lg: 'inset 0 1px 0 0 rgb(255 255 255 / 0.9), 0 0 0 1px rgb(30 58 138 / 0.06), 0 6px 12px -6px rgb(15 23 42 / 0.06), 0 24px 48px -16px rgb(30 64 175 / 0.22)',
        xl: '0 0 0 1px rgb(30 58 138 / 0.06), 0 10px 20px -10px rgb(15 23 42 / 0.08), 0 32px 64px -20px rgb(30 64 175 / 0.30)',
        glass: 'inset 0 1px 0 0 rgb(255 255 255 / 0.9), 0 0 0 1px rgb(255 255 255 / 0.55), 0 8px 32px -8px rgb(30 64 175 / 0.14)',
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        elevation: '0 10px 25px -5px rgba(29, 78, 216, 0.07), 0 8px 10px -6px rgba(29, 78, 216, 0.04)'
      }
    }
  },
  // forms en mode 'class' : seuls les champs portant form-input, form-checkbox... sont stylés
  // (les écrans Material n'utilisaient pas ce plugin).
  plugins: [forms({ strategy: 'class' }), containerQueries]
}
