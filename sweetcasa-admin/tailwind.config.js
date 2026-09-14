/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F8F7FC',
        ink: '#201A2B',
        navy: {
          DEFAULT: '#6D3BE7',
          light: '#8055EA',
          dark: '#4D24B8',
        },
        gold: {
          DEFAULT: '#A78BFA',
          light: '#C4B5FD',
        },
        success: '#2F7A4D',
        danger: '#B3432B',
        pending: '#8A6D1F',
        line: '#E9E4F2',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
}
