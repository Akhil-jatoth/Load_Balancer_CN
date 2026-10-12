import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/backends': 'http://127.0.0.1:8000',
      '/rules': 'http://127.0.0.1:8000',
      '/settings': 'http://127.0.0.1:8000',
      '/metrics': 'http://127.0.0.1:8000',
      '/connections': 'http://127.0.0.1:8000',
      '/logs': 'http://127.0.0.1:8000',
      '/traffic': 'http://127.0.0.1:8000',
      '/live': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      }
    }
  }
})
