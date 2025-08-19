import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
   base: '/',
  server: {
    host: true, // or use '0.0.0.0'
    port: 3000
  }
})