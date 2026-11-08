import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' works on GitHub Pages sub-paths (e.g. /schoolsync/) and on Vercel
export default defineConfig({ base: './', plugins: [react(), tailwindcss()] })
