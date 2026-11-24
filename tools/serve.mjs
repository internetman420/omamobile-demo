#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// A plain static server for the demo: no build step, no dependencies.
//
//   node tools/serve.mjs [port]
//
// Serves the repository root; every path falls back to index.html so deep
// links like #app/messages/maya work.

import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const port = Number(process.argv[2] || process.env.PORT || 4173)

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
}

export function serve(listenPort = port) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://localhost")
    let pathname = decodeURIComponent(url.pathname)
    if (pathname.endsWith("/")) pathname += "index.html"
    const file = join(root, normalize(pathname).replace(/^(\.\.[/\\])+/, ""))
    try {
      const info = await stat(file)
      if (info.isDirectory()) throw new Error("directory")
      const body = await readFile(file)
      res.writeHead(200, {
        "content-type": MIME[extname(file)] || "application/octet-stream",
        "cache-control": "no-store",
        "service-worker-allowed": "/",
      })
      res.end(body)
    } catch {
      try {
        const body = await readFile(join(root, "index.html"))
        res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-store" })
        res.end(body)
      } catch {
        res.writeHead(404, { "content-type": "text/plain" })
        res.end("not found")
      }
    }
  })
  return new Promise((resolve) => server.listen(listenPort, () => resolve(server)))
}

if (process.argv[1] && process.argv[1].endsWith("serve.mjs")) {
  serve().then(() => {
    console.log(`omamobile-demo on http://localhost:${port}/`)
  })
}
