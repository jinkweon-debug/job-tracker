import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest', // hand-written minimal SW instead of workbox's generateSW (which refuses to build with zero caching rules)
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      manifest: false, // public/manifest.webmanifest is hand-authored and already linked in index.html
      injectRegister: false, // registered manually in main.jsx so we control timing
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
