// PYQ Saarthi — offline support (service worker)
// Niyam: internet ho to hamesha NAYA data (network-first); internet na ho to pichhla save kiya hua (cache).
const CACHE = "pyqs-v3";
const SHELL = ["/", "/index.html", "/css/style.css", "/js/config.js", "/js/app.js", "/js/shell.js", "/js/exam.js",
  "/data/catalog.json", "/assets/logo.webp", "/assets/trophy.webp", "/assets/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  const same = url.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return;                         // सुधार शीट, रिपोर्ट आदि — सीधे इंटरनेट से
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then(res => {
      if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: url.pathname === "/" || url.pathname === "/index.html" })
      .then(r => r || (req.mode === "navigate" ? caches.match("/index.html") : undefined)))
  );
});
