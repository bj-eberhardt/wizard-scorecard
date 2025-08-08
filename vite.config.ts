import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ESM-kompatible Config
export default defineConfig({
  plugins: [react()],
})