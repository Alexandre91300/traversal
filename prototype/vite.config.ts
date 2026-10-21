import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Single self-contained index.html so the prototype can be shared as one page.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
})
