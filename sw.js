const CACHE = "asta-fantacalcio-v67";

const ASSETS = [
    "./",
    "./index.html",
    "./app.js",
    "./campetti.js",
    "./players.js",
    "./listone-version.json",
    "./manifest.json",
    "./icon.svg",
    "./assets/campetto.JPG"
];


/* INSTALLAZIONE */

self.addEventListener("install", event => {

    event.waitUntil(

        caches
            .open(CACHE)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())

    );

});


/* ATTIVAZIONE */

self.addEventListener("activate", event => {

    event.waitUntil(

        caches
            .keys()
            .then(keys =>

                Promise.all(
                    keys
                    .filter(key => key.startsWith("asta-fantacalcio-") && key !== CACHE)
                    .map(key => caches.delete(key))
                )

            )
            .then(() => self.clients.claim())

    );

});


/* STRATEGIA DI CACHE
   Network-first per ricevere sempre l'ultima versione
   quando c'è connessione, con fallback offline alla cache.
*/

self.addEventListener("fetch", event => {

    if(event.request.method !== "GET") return;

    const request = event.request;


    event.respondWith(

        fetch(request)

        .then(response => {

            if(
                response &&
                response.status === 200 &&
                request.url.startsWith(self.location.origin)
            ){

                const copy = response.clone();

                caches
                    .open(CACHE)
                    .then(cache => cache.put(request, copy));

            }

            return response;

        })

        .catch(() =>

            caches
                .match(request)
                .then(cached =>

                    cached ||
                    (
                        request.mode === "navigate"
                            ? caches.match("./index.html")
                            : undefined
                    )

                )

        )

    );

});