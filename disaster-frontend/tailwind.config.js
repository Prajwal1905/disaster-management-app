/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite',
        'pulse-glow-soft': 'pulseGlowSoft 3s infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px 0 rgba(255,0,0,0.5)' },
          '50%': { boxShadow: '0 0 20px 5px rgba(255,0,0,0.7)' },
        },
        pulseGlowSoft: {
          '0%, 100%': { boxShadow: '0 0 3px 0 rgba(255,255,0,0.3)' },
          '50%': { boxShadow: '0 0 15px 3px rgba(255,255,0,0.5)' },
        },
      },
    },
  },
  plugins: [],
}
