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
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        bg: '#06060A',
        bg2: '#0f0a0c',
        bg3: '#1a1012',
        border: '#2a1520',
        muted: '#988088',
        accent: '#10B981',
        accent2: '#3D1520',
        cherry: '#7A3848',
        blue: '#1a6fd4',
        success: '#10B981',
      },
    },
  },
  plugins: [],
}
