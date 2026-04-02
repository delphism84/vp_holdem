import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    /** 로컬 dev: FE는 :5173, BE는 :3080 — 동일 origin으로 /ws/holdem 프록시 */
    proxy: {
      '/ws/holdem': {
        target: 'http://127.0.0.1:3080',
        ws: true,
        changeOrigin: true,
      },
    },
    hmr: {
      protocol: 'wss',
      host: 'game.kingofzeusfin.com',
      clientPort: 443,
    },
  },
})
