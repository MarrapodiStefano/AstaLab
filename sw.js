const CACHE = "asta-fantacalcio-v112";

const ASSETS = [
    "./","./index.html","./app.js","./campetti.js","./ui-fixes.js","./oracolo.js","./brain-sync-fix.js","./brain-picker-fix.js","./players.js","./listone-version.json","./manifest.json","./icon.svg","./assets/campetto.JPG"
];

self.addEventListener("install", event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("asta-fantacalcio-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
    if(event.request.method !== "GET") return;
    const request=event.request,url=new URL(request.url),sameOrigin=url.origin===self.location.origin;
    const freshResource=sameOrigin&&(request.mode==="navigate"||request.destination==="script"||request.destination==="style");
    event.respondWith(fetch(request,{cache:freshResource?"no-store":"default"}).then(response=>{if(response&&response.status===200&&sameOrigin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(()=>caches.match(request).then(cached=>cached||(request.mode==="navigate"?caches.match("./index.html"):undefined))));
});
self.addEventListener("message", event => { if(event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
