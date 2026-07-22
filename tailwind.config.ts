import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          lime: '#7cc142',
          black: '#0f0f0f',
          pink: '#dd0b83',
          cyan: '#38c2d6',
          navy: '#2a2b3e',
        },
        // Legacy aliases for compatibility
        primary: '#7cc142',
        secondary: '#0f0f0f',
        background: {
          DEFAULT: '#2a2b3e',
          light: '#3d3e52',
          dark: '#0f0f0f',
        },
        text: {
          DEFAULT: '#F1F5F9',
          light: '#F8FAFC',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['futura-pt', 'system-ui', 'sans-serif'],
        heading: ['futura-pt', 'sans-serif'],
        'futura-book': ['futura-pt-book', 'futura-pt', 'sans-serif'],
        'futura-bold': ['futura-pt-bold', 'futura-pt', 'sans-serif'],
        'futura-heavy': ['futura-pt-heavy', 'futura-pt', 'sans-serif'],
        jost: ['Jost', 'system-ui', 'sans-serif'],
        'be-vietnam': ['var(--font-be-vietnam)', 'var(--font-noto-sans)', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config

