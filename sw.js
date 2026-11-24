// SPDX-License-Identifier: MIT
// The demo's service worker: the whole phone is precached, because a demo
// that needs a network is not much of a demo. Navigations try the network
// first so a new deploy is picked up, and fall back to the cache offline.

const VERSION = "oma-demo-v5"
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/tokens.css",
  "css/device.css",
  "css/shell.css",
  "css/lock.css",
  "css/apps.css",
  "js/main.js",
  "js/util.js",
  "js/icons.js",
  "js/ui.js",
  "js/data.js",
  "js/store.js",
  "js/theme.js",
  "js/themes.generated.js",
  "js/gestures.js",
  "js/statusbar.js",
  "js/home.js",
  "js/apps.js",
  "js/pill.js",
  "js/drawer.js",
  "js/switcher.js",
  "js/shade.js",
  "js/lock.js",
  "js/toasts.js",
  "js/sheets.js",
  "assets/icons/icon.svg",
  "assets/icons/icon-180.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/maskable-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION)
      await cache.addAll(ASSETS)
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(VERSION)
          cache.put("index.html", fresh.clone())
          return fresh
        } catch {
          const cache = await caches.open(VERSION)
          return (await cache.match("index.html")) || (await cache.match("./")) || Response.error()
        }
      })(),
    )
    return
  }

  // Stale-while-revalidate: the cached copy answers at once, and the next
  // load gets whatever the deploy changed. A demo that pins its first version
  // forever would be worse than one that works offline.
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION)
      const hit = await cache.match(request, { ignoreSearch: true })
      const network = fetch(request)
        .then((fresh) => {
          if (fresh.ok) cache.put(request, fresh.clone())
          return fresh
        })
        .catch(() => null)
      if (hit) {
        event.waitUntil(network)
        return hit
      }
      const fresh = await network
      return fresh || Response.error()
    })(),
  )
})
