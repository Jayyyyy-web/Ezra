import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' lets the built site work from any path, including GitHub Pages.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1000 },
  plugins: [react()],
})
