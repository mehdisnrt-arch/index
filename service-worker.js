var cacheName = "index-compteur-radio-v1";
var filesToCache = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icon.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(cacheName).then(function (cache) {
      return cache.addAll(filesToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== cacheName) {
          return caches.delete(key);
        }
        return Promise.resolve();
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then(function (response) {
        var copy = response.clone();
        caches.open(cacheName).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      }).catch(function () {
        return caches.match("index.html");
      });
    })
  );
});
