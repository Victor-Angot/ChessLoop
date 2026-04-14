import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { authApiDevPlugin } from './vite/authApiDevPlugin'

function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return
  if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
    return 'react-vendor'
  }
  if (id.includes('scheduler')) return 'react-vendor'
  if (id.includes('react-router')) return 'router'
  if (id.includes('lucide-react')) return 'lucide'
  if (id.includes('chess.js')) return 'chess'
  if (id.includes('react-chessboard')) return 'chessboard'
  if (id.includes('tsparticles')) return 'tsparticles'
  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  plugins: [
    react(),
    authApiDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ChessLoop',
        short_name: 'ChessLoop',
        description: 'Échecs et analyse dans le navigateur',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0c0f14',
        background_color: '#0c0f14',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/sf/stockfish-worker.js'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/sf/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'stockfish-static',
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
