#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// A scratch probe: load the demo, do one thing, print state. Used while
// tuning gestures; not part of the test suite.
//
//   node tools/probe.mjs "<expression to evaluate after load>"

import { spawn } from "node:child_process"
import { createServer } from "node:http"
import { readFile, stat, mkdtemp } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const PORT = 4184
const DEBUG_PORT = 9334
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname)
  const file = join(root, pathname === "/" ? "index.html" : pathname)
  try {
    const info = await stat(file)
    if (!info.isFile()) throw new Error("dir")
    const ext = file.slice(file.lastIndexOf("."))
    const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" }[ext] || "application/octet-stream"
    res.writeHead(200, { "content-type": mime })
    res.end(await readFile(file))
  } catch {
    res.writeHead(200, { "content-type": "text/html" })
    res.end(await readFile(join(root, "index.html")))
  }
})
server.listen(PORT)

const profile = await mkdtemp(join(tmpdir(), "oma-probe-"))
const chromium = spawn("chromium", ["--headless=new", "--disable-gpu", `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, "--window-size=1500,1000", "about:blank"], { stdio: "ignore" })

let ws
for (let i = 0; i < 60 && !ws; i++) {
  await sleep(200)
  try {
    const info = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json()
    ws = new WebSocket(info.webSocketDebuggerUrl)
    await new Promise((res, rej) => {
      ws.addEventListener("open", res)
      ws.addEventListener("error", rej)
    })
  } catch {
    ws = null
  }
}

let id = 0
const pending = new Map()
const events = []
ws.addEventListener("message", (e) => {
  const d = JSON.parse(e.data)
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d)
    pending.delete(d.id)
  } else events.push(d)
})
const send = (method, params = {}, sessionId) =>
  new Promise((res) => {
    const i = ++id
    pending.set(i, res)
    ws.send(JSON.stringify({ id: i, method, params, sessionId }))
  })

const { result: target } = await send("Target.createTarget", { url: "about:blank" })
const { result: attached } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true })
const sid = attached.sessionId
await send("Runtime.enable", {}, sid)
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sid)
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description }
  return r.result?.result?.value
}
await send("Emulation.setDeviceMetricsOverride", { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false }, sid)
await send("Page.navigate", { url: `http://localhost:${PORT}/?quiet=1#home` }, sid)
await sleep(900)

console.log("state:", await evaluate(`(() => { const s = window.__omaDemo.store.get(); return { screen: document.body.dataset.screen, page: s.page, shade: s.shade, drawer: s.drawer, scale: getComputedStyle(document.getElementById('stage')).getPropertyValue('--s'), hash: location.hash } })()`))

const expression = process.argv[2] || "document.title"
console.log("result:", await evaluate(expression))

const errors = events.filter((e) => e.method === "Runtime.exceptionThrown")
if (errors.length) console.log("errors:", errors.map((e) => e.params.exceptionDetails.exception?.description).join("\n"))

chromium.kill()
server.close()
process.exit(0)
