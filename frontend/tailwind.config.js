module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        primary: { 50:'#fff1f2',100:'#ffe4e6',500:'#ef4444',600:'#dc2626',700:'#b91c1c',800:'#991b1b' },
        emergency: { ambulance:'#ef4444', police:'#3b82f6', fire:'#f97316' },
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4,0,0.6,1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
};
