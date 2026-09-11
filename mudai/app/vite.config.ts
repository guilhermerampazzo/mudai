import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Identificador único deste build. Serve para as fotos do catálogo
// nunca virem do cache do CDN quando o app é atualizado.
const idBuild = Date.now().toString(36)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  define: {
    __ID_BUILD__: JSON.stringify(idBuild),
  },
  server: {
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
})
