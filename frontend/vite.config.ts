import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base: './'` keeps asset URLs relative so the built app also works when
// Electron loads it over the file:// protocol.
const rootDir = import.meta.dirname

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        pet: resolve(rootDir, 'pet.html'),
      },
    },
  },
})
