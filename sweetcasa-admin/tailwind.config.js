/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F6F3',
        ink: '#14181C',
        navy: {
          DEFAULT: '#16324F',
          light: '#22456D',
          dark: '#0E2036',
        },
        gold: {
          DEFAULT: '#C98A2C',
          light: '#E4A84F',
        },
        success: '#2F7A4D',
        danger: '#B3432B',
        pending: '#8A6D1F',
        line: '#E4E1D8',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
}
