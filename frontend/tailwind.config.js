/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0b0d12',
        surface: '#14171f',
        elevated: '#1a1e28',
        line: '#232833',
        'line-strong': '#2e3542',
        ink: '#e8eaed',
        'ink-muted': '#9aa3b2',
        'ink-faint': '#6b7484',
        accent: '#6366f1',
        'accent-hover': '#7c7ff5',
        live: '#22c55e',
        scheduled: '#3b82f6',
        ended: '#6b7484',
        danger: '#f0616d',
        tile: '#171b24',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.4)',
        pop: '0 8px 30px rgba(0,0,0,.5)',
        bar: '0 8px 40px rgba(0,0,0,.6)',
      },
      keyframes: {
        rise: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise .28s ease-out both',
      },
    },
  },
  plugins: [],
}
