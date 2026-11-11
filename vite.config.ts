import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The app is served from https://<user>.github.io/sat-vocab/, so every asset
// path must start with /sat-vocab/.
export default defineConfig({
  base: '/sat-vocab/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'SAT Vocab',
        short_name: 'SAT Vocab',
        description: 'Study 1,000+ Digital SAT words with spaced review and Words in Context practice. Works offline.',
        theme_color: '#184f95',
        background_color: '#f6f5f1',
        display: 'standalone',
        orientation: 'any',
        start_url: '/sat-vocab/',
        scope: '/sat-vocab/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell and the word data so everything works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/sat-vocab/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
