const CACHE = "asta-fantacalcio-v145";

const ASSETS = ["./","./index.html","./app.js","./campetti.js","./ui-fixes.js","./oracolo.js","./brain-picker-fix.js","./brain-target-price-fix.js","./brain-strategy-normalizer.js","./players.js","./listone-version.json","./manifest.json","./icon.svg","./assets/campetto.JPG"];

self.addEventListener("install", event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("asta-fantacalcio-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
    if(event.request.method !== "GET") return;
    const request=event.request,url=new URL(request.url),sameOrigin=url.origin===self.location.origin;
    const freshResource=sameOrigin&&(request.mode==="navigate"||request.destination==="script"||request.destination==="style");
    if(request.mode==="navigate" && sameOrigin){
        event.respondWith(
            fetch(request,{cache:"no-store"}).then(async response=>{
                if(!response || response.status!==200) return response;
                const type=response.headers.get("content-type")||"";
                if(!type.includes("text/html")) return response;
                const html=await response.text();
                let injected=html;
                if(!injected.includes("brain-picker-fix.js")) injected=injected.replace(/<\/body>/i,'<script src="./brain-picker-fix.js?v=3.5.71" data-brain-picker-371></script>\n</body>');
                if(!injected.includes("ui-fixes.js")) injected=injected.replace(/<\/body>/i,'<script src="./ui-fixes.js?v=3.5.77" data-ui-fixes-377></script>\n</body>');
                if(!injected.includes("brain-target-price-fix.js")) injected=injected.replace(/<\/body>/i,'<script src="./brain-target-price-fix.js?v=3.5.72" data-brain-target-price-372></script>\n</body>');
                if(!injected.includes("brain-strategy-normalizer.js")) injected=injected.replace(/<\/body>/i,'<script src="./brain-strategy-normalizer.js?v=3.5.77" data-brain-normalizer-377></script>\n</body>');
                const headers=new Headers(response.headers);
                headers.set("content-type","text/html; charset=utf-8");
                return new Response(injected,{status:response.status,statusText:response.statusText,headers});
            }).catch(()=>caches.match(request).then(cached=>cached||(request.mode==="navigate"?caches.match("./index.html"):undefined)))
        );
        return;
    }
    event.respondWith(fetch(request,{cache:freshResource?"no-store":"default"}).then(response=>{if(response&&response.status===200&&sameOrigin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(()=>caches.match(request).then(cached=>cached||(request.mode==="navigate"?caches.match("./index.html"):undefined))));
});
self.addEventListener("message", event => { if(event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
