/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        relay: {
          bg: '#0B0E14',
          surface: '#111622',
          card: '#161C2A',
          border: '#232D42',
          muted: '#8E9BAE',
          accent: '#2DD4BF',
          accentHover: '#14B8A6',
          accentDim: '#0D3833',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.035em',
        tighter: '-0.02em',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'teal-glow': '0 0 20px -3px rgba(45, 212, 191, 0.3)',
      }
    },
  },
  plugins: [],
}
