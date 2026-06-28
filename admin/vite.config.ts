import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://122.51.235.145',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
