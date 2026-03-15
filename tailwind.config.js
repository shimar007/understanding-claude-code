/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
        display: ['var(--font-display)', 'serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#0a0a0a',
          50: '#f5f5f0',
          100: '#e8e8e0',
          200: '#c8c8b8',
          300: '#a0a090',
          400: '#707060',
          500: '#4a4a3a',
          600: '#2a2a1a',
          700: '#1a1a0a',
          800: '#0f0f07',
          900: '#0a0a04',
        },
        amber: {
          DEFAULT: '#f5a623',
          50: '#fffbf0',
          100: '#fef3d0',
          200: '#fde49a',
          300: '#fbd060',
          400: '#f8bc30',
          500: '#f5a623',
          600: '#e08c0a',
          700: '#b86f08',
          800: '#8f5306',
          900: '#6b3d04',
        },
        paper: '#f8f6f1',
        cream: '#faf8f3',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'pulse-dot': 'pulseDot 1.2s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.8)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
