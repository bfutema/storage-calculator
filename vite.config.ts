import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function viteBase(): string {
  const p = process.env.VITE_BASE_PATH?.trim()
  if (!p || p === '/') return '/'
  return p.endsWith('/') ? p : `${p}/`
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** GitHub Pages (subpath): o script deploy define VITE_BASE_PATH automaticamente. */
  base: viteBase(),
})
