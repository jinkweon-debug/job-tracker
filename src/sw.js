// Minimal service worker — enables install capability only, no offline data
// sync or cache-first strategies. vite-plugin-pwa's injectManifest build step
// requires this exact token present so it can inject the build's asset list;
// it's intentionally never routed/precached.
self.__WB_MANIFEST;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
