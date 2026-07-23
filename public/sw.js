const CACHE="pharmintel-shell-v1";
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET"||new URL(event.request.url).pathname.startsWith("/api/"))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
