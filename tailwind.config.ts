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
        primary: {
          DEFAULT: '#7cc142', // Brand green
          light: '#9fd46a',
          dark: '#5a8d2f',
        },
        secondary: {
          DEFAULT: '#0f0f0f', // Brand black
          light: '#1a1a1a',
          dark: '#000000',
        },
        background: {
          DEFAULT: '#2a2b3e', // Brand background
          light: '#3d3e52',
          dark: '#1a1b2e',
        },
        text: {
          DEFAULT: '#F1F5F9',
          light: '#F8FAFC',
          muted: '#94A3B8',
        },
        accent: {
          DEFAULT: '#dd0b83', // Brand magenta
          light: '#ff3da1',
          dark: '#b00866',
        },
        'accent-2': {
          DEFAULT: '#38c2d6', // Brand cyan
          light: '#5dd4e6',
          dark: '#2a9aaa',
        },
      },
      fontFamily: {
        sans: ['futura-pt', 'system-ui', 'sans-serif'],
        heading: ['noxa', 'futura-pt', 'sans-serif'],
        'futura-book': ['futura-pt-book', 'futura-pt', 'sans-serif'],
        'futura-bold': ['futura-pt-bold', 'futura-pt', 'sans-serif'],
        'futura-heavy': ['futura-pt-heavy', 'futura-pt', 'sans-serif'],
        'noxa': ['noxa', 'sans-serif'],
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

