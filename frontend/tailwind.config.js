/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          2: '#111111',
          3: '#1a1a1a',
        },
        brand: {
          red: '#E8201A',
          'red-dim': 'rgba(232, 32, 26, 0.16)',
          'red-faint': 'rgba(232, 32, 26, 0.06)',
          orange: '#FF6B2B',
          'orange-dim': 'rgba(255, 107, 43, 0.16)',
        },
        semantic: {
          consensus: '#22C55E',
          'consensus-dim': 'rgba(34, 197, 94, 0.12)',
          pending: '#F59E0B',
          'pending-dim': 'rgba(245, 158, 11, 0.12)',
          dispute: '#EF4444',
          slashed: '#7C3AED',
          'slashed-dim': 'rgba(124, 58, 237, 0.12)',
        },
        text: {
          1: '#FFFFFF',
          2: '#A3A3A3',
          3: '#525252',
        },
        border: {
          DEFAULT: '#1F1F1F',
          2: '#2A2A2A',
          red: 'rgba(232, 32, 26, 0.27)',
        },
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'Space Mono', 'monospace'],
        sans: ['var(--font-sans)', 'Space Grotesk', 'sans-serif'],
        instrument: ['var(--font-instrument)', 'Instrument Serif', 'serif'],
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, #1F1F1F 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-32': '32px 32px',
      },
    },
  },
  plugins: [],
}
