/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Photoshop-like dark color palette
        panel: '#292929', 
        canvas: '#1E1E1E', 
        accent: '#313131', 
        textprimary: '#D0D0D0', 
        textsecondary: '#A0A0A0', 
        highlight: '#0078D7', 
        highlightHover: '#005A9E',
      }
    },
  },
  plugins: [],
}
