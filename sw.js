// Scope the cache name as multiple Pages projects share one origin.
const PREFIX = `galaxia-classica-offline:${self.registration.scope}:`;
const CACHE = `${PREFIX}v2`;
const ASSETS = ['./','./index.html','./styles.css','./app.js','./engine.mjs','./storage.mjs','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
const urls = ASSETS.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith(PREFIX)&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req=event.request,u=new URL(req.url);
  if(req.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;
  // Only the precached shell is handled; query strings do not break offline launches.
  u.search='';u.hash='';
  if(!urls.includes(u.href))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(u.href);
    return cached||fetch(req);
  }));
});
