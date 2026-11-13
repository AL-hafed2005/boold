tailwind.config = {
  theme: { extend: {
    fontFamily: { sans: ['Cairo', 'sans-serif'] },
    colors: {
      crimson: { 50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e',600:'#e11d48',700:'#be123c',800:'#9f1239',900:'#881337' },
      slate: { 850:'#1e293b', 900:'#0f172a' }
    },
    animation: { 'pulse-slow':'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite', 'float':'float 6s ease-in-out infinite' },
    keyframes: { float: { '0%,100%':{transform:'translateY(0)'}, '50%':{transform:'translateY(-10px)'} } }
  } }
}
