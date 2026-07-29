import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--bg))',
        card: 'hsl(var(--card))',
        border: 'hsl(var(--card-border))',
        violet: { DEFAULT: 'hsl(var(--violet))', dim: 'hsl(var(--violet-dim))' },
        amber: { DEFAULT: 'hsl(var(--amber))', dim: 'hsl(var(--amber-dim))' },
        green: { DEFAULT: 'hsl(var(--green))', dim: 'hsl(var(--green-dim))' },
        red: { DEFAULT: 'hsl(var(--red))', dim: 'hsl(var(--red-dim))' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist)', 'monospace'],
      },
      animation: {
        'pulse-border': 'pulse-border 2s ease-in-out infinite',
        skeleton: 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { borderColor: 'hsl(var(--card-border))' },
          '50%': { borderColor: 'hsl(var(--violet))' },
        },
        skeleton: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
