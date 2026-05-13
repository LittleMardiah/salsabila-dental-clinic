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
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Tambahan warna dari desain
        "primary-fixed": "#ffdad9",
        "secondary-fixed": "#66ff8e",
        "surface": "#fff8f7",
        "surface-container-low": "#f9f2f2",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#eee6e6",
        "on-surface": "#1e1b1b",
        "on-surface-variant": "#514443",
        "outline-variant": "#d5c2c1",
        "secondary": "#006d2f",
        "secondary-container": "#5dfd8a",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "primary-container": "#dca1a1",
        "on-primary-fixed-variant": "#663a3b",
        "on-primary-fixed": "#331012",
        "on-secondary-container": "#007232",
        "on-secondary-fixed-variant": "#005322",
        "tertiary-container": "#8fb9a3",
        "background": "#fff8f7",
      },
      fontFamily: {
        headline: ['Poppins', 'sans-serif'],
        body: ['Rethink Sans', 'sans-serif'],
        label: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        ambient: '0px 12px 32px rgba(129, 81, 82, 0.08)',
        premium: '0 20px 50px -12px rgba(220, 161, 161, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.7)',
      },
      backgroundImage: {
        'cta-gradient': 'linear-gradient(135deg, #dca1a1 0%, #663a3b 100%)',
      },
      animation: {
        gradient: 'gradient 3s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [],
}