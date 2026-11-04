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
  // Pin the dev server to IPv4. On Windows `localhost` may bind only to ::1,
  // which makes `wait-on tcp:127.0.0.1:5173` (electron:dev) hang forever.
  // strictPort: fail loudly instead of silently moving to 5174, since the
  // Electron URL in electron:dev is fixed to this port.
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        pet: resolve(rootDir, 'pet.html'),
      },
    },
  },
})
