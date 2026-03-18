// Basic service worker for PWA offline support
const CACHE_NAME = 'josies-faves-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // For navigation requests, try network first, then fall back gracefully
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          `<!doctype html>
<html>
<head><title>Josie's Faves - Offline</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, sans-serif; text-align: center; padding: 60px 20px; background: #fdfaf7; }
  h1 { color: #e11d48; font-size: 2rem; margin-bottom: 16px; }
  p { color: #666; font-size: 1.1rem; }
  .emoji { font-size: 4rem; margin-bottom: 24px; }
</style>
</head>
<body>
  <div class="emoji">📖</div>
  <h1>Josie's Faves</h1>
  <p>You're offline right now.<br>Connect to the internet to save and browse recipes.</p>
</body>
</html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
  }
});
