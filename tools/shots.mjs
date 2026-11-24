#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Renders the demo's screens to PNG with headless Chromium, so a change can
// be looked at without a browser in the way:
//
//   node tools/shots.mjs            all routes into ./shots
//   node tools/shots.mjs home shade only these
//
// Needs `chromium` on PATH. Fails loudly if the page logs an error.

import { spawn } from "node:child_process"
import { mkdir, rm } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "shots")
const PORT = 4181

const ROUTES = {
  lock: "#lock",
  pin: "#lock/pin",
  home: "#home",
  "home-2": "#home/1",
  "home-3": "#home/2",
  shade: "#shade",
  drawer: "#drawer",
  switcher: "#switcher",
  theme: "#sheet/theme",
  about: "#sheet/about",
  messages: "#app/messages",
  thread: "#app/messages/maya",
  phone: "#app/phone",
  contacts: "#app/contacts",
  contact: "#app/contacts",
  appearance: "#app/appearance",
  calendar: "#app/calendar",
  weather: "#app/weather",
  notes: "#app/notes",
  settings: "#app/settings",
  terminal: "#app/terminal",
  camera: "#app/camera",
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
}

function server() {
  return new Promise((resolve) => {
    const s = createServer(async (req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname)
      const file = join(root, pathname === "/" ? "index.html" : pathname)
      try {
        const info = await stat(file)
        if (!info.isFile()) throw new Error("dir")
        const ext = file.slice(file.lastIndexOf("."))
        res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" })
        res.end(await readFile(file))
      } catch {
        res.writeHead(200, { "content-type": MIME[".html"] })
        res.end(await readFile(join(root, "index.html")))
      }
    })
    s.listen(PORT, () => resolve(s))
  })
}

const MOBILE = process.argv.includes("--mobile")
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"))
const routes = Object.entries(ROUTES).filter(([name]) => !only.length || only.includes(name))

const target = MOBILE ? join(root, "assets/screenshots") : outDir
await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })
const srv = await server()

let failures = 0
for (const [name, hash] of routes) {
  const file = join(target, `${MOBILE ? `phone-${name}` : name}.png`)
  const url = `http://localhost:${PORT}/?quiet=1${hash}`
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    // Stills, not a film: the phone's transitions collapse to their end state.
    "--force-prefers-reduced-motion",
    "--force-device-scale-factor=1",
    MOBILE ? "--window-size=360,780" : "--window-size=1500,1000",
    ...(MOBILE ? ["--force-device-scale-factor=2"] : []),
    "--virtual-time-budget=2500",
    "--screenshot=" + file,
    url,
  ]
  const code = await new Promise((resolve) => {
    const child = spawn("chromium", args, { stdio: ["ignore", "pipe", "pipe"] })
    let err = ""
    child.stderr.on("data", (d) => (err += d))
    child.on("close", (c) => {
      const noisy = err
        .split("\n")
        .filter((line) => /Uncaught|SyntaxError|TypeError|ReferenceError/.test(line))
      if (noisy.length) {
        failures++
        console.error(`✗ ${name}: ${noisy.slice(0, 4).join(" | ")}`)
      }
      resolve(c)
    })
  })
  if (code !== 0) {
    failures++
    console.error(`✗ ${name}: chromium exited ${code}`)
  } else {
    console.log(`✓ ${name} → ${file.replace(root + "/", "")}`)
  }
}

srv.close()
if (failures) {
  console.error(`\n${failures} shot(s) failed`)
  process.exit(1)
}
console.log(`\n${routes.length} shots in ${target}`)
