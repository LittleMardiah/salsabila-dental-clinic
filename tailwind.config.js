/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warna sistem default 
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "primary-foreground": "hsl(var(--primary-foreground))",

        primary: "#815152",

        // Warna lainnya dari desain Stitch
        "primary-fixed": "#ffdad9",
        "primary-fixed-dim": "#f5b7b7",
        "on-primary-fixed": "#331012",
        "on-primary-fixed-variant": "#663a3b",
        "primary-container": "#dca1a1",
        "on-primary-container": "#623738",
        secondary: "#006d2f",
        "secondary-fixed": "#66ff8e",
        "secondary-fixed-dim": "#3de273",
        "on-secondary-fixed": "#002109",
        "on-secondary-fixed-variant": "#005322",
        "secondary-container": "#5dfd8a",
        "on-secondary-container": "#007232",
        tertiary: "#3f6654",
        "tertiary-fixed": "#c1ecd5",
        "tertiary-fixed-dim": "#a5d0b9",
        "on-tertiary-fixed": "#002114",
        "on-tertiary-fixed-variant": "#274e3d",
        "tertiary-container": "#8fb9a3",
        "on-tertiary-container": "#234a39",
        surface: "#fff8f7",
        "surface-dim": "#dfd8d8",
        "surface-bright": "#fff8f7",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f9f2f2",
        "surface-container": "#f4ecec",
        "surface-container-high": "#eee6e6",
        "surface-container-highest": "#e8e1e1",
        "on-surface": "#1e1b1b",
        "on-surface-variant": "#514443",
        "inverse-surface": "#333030",
        "inverse-on-surface": "#f7efef",
        "inverse-primary": "#f5b7b7",
        outline: "#837373",
        "outline-variant": "#d5c2c1",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        background: "#fff8f7",
        "on-background": "#1e1b1b",
        "surface-tint": "#815152",
        whatsapp: "#25D366",
      },
      fontFamily: {
        headline: ['Plus Jakarta Sans', 'sans-serif'],   // untuk judul besar (heading)
        display: ['Public Sans', 'sans-serif'],          // untuk subjudul atau teks display
        body: ['Plus Jakarta Sans', 'sans-serif'],       // untuk paragraf, konten umum
        label: ['Plus Jakarta Sans', 'sans-serif'],      // untuk label form, tombol kecil
      },
      borderRadius: {
        '2xl': '1rem',      
        '3xl': '1.5rem',    
      },
      boxShadow: {
        ambient: '0px 12px 32px rgba(129, 81, 82, 0.08)',
        premium: '0 20px 50px -12px rgba(220, 161, 161, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.7)',
        'soft-3d': '0 10px 30px -10px rgba(129, 81, 82, 0.12), 0 20px 40px -20px rgba(129, 81, 82, 0.08)',
        'deep-3d': '0 20px 50px -12px rgba(129, 81, 82, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
        'active-inset': 'inset 2px 2px 4px rgba(0, 0, 0, 0.05), inset -2px -2px 4px rgba(255, 255, 255, 0.8)',
        'silk': '0 20px 40px -10px rgba(129, 81, 82, 0.1)',
        'diamond': '0 8px 32px 0 rgba(129, 81, 82, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.4)',
        'floating': '0 12px 24px -6px rgba(129, 81, 82, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
        'floating-hover': '0 20px 32px -8px rgba(129, 81, 82, 0.5)',
        'high-gloss': 'inset 0 2px 4px rgba(255, 255, 255, 0.8), 0 4px 12px rgba(129, 81, 82, 0.03)',
        'high-gloss-focus': 'inset 0 2px 4px rgba(255, 255, 255, 0.9), 0 8px 20px rgba(129, 81, 82, 0.08)',
      },
      backgroundImage: {
        'cta-gradient': 'linear-gradient(135deg, #815152 0%, #623738 100%)',
        'shimmer': 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
        'floating-gradient': 'linear-gradient(135deg, #815152 0%, #663a3b 100%)',
        'silk-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4))',
      },
      animation: {
        gradient: 'gradient 3s linear infinite',
        'pulse-radiance': 'pulse-radiance 4s infinite ease-in-out',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'pulse-radiance': {
          '0%, 100%': { boxShadow: '0 0 40px rgba(220, 161, 161, 0.15), 0 30px 60px -12px rgba(129, 81, 82, 0.2)' },
          '50%': { boxShadow: '0 0 60px rgba(220, 161, 161, 0.3), 0 35px 70px -10px rgba(129, 81, 82, 0.3)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}