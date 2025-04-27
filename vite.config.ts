import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss' // Correct import for PostCSS plugin
import autoprefixer from 'autoprefixer' // Import autoprefixer

// https://vite.dev/config/
export default defineConfig({
  base: '/sh-calc/',
  plugins: [react()],
  css: { // Add explicit PostCSS configuration
    postcss: {
      plugins: [
        tailwindcss, // Use the correct plugin
        autoprefixer
      ],
    },
  },
})
