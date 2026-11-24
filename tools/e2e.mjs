#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Drives the demo in headless Chromium over the DevTools Protocol and checks
// that it behaves like a phone: unlock with the PIN pad, open Messages from the
// dock, send a text, go home on the pill, pull the shade, toggle a tile, pick
// a theme, swipe up for the drawer and back out of an app with an edge swipe.
//
//   node tools/e2e.mjs
//
// No dependencies: Node's built-in WebSocket speaks CDP.

import { spawn } from "node:child_process"
import { createServer } from "node:http"
import { readFile, stat, mkdtemp } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const PORT = 4183
// A fresh debugging port every run: a browser left over from an interrupted
// run must never be mistaken for this one.
const DEBUG_PORT = 9400 + Math.floor(Math.random() * 400)

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
}

let pass = 0
let fail = 0
const failures = []

function check(name, condition, extra = "") {
  if (condition) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    failures.push(name)
    console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`)
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- static server --------------------------------------------------------

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname)
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
    server.listen(PORT, () => resolve(server))
  })
}

// ---- CDP -----------------------------------------------------------------

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.events = []
    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data)
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id)
        this.pending.delete(data.id)
        if (data.error) reject(new Error(JSON.stringify(data.error)))
        else resolve(data.result)
      } else {
        this.events.push(data)
      }
    })
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
}

async function connect() {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)
  const info = await res.json()
  const ws = new WebSocket(info.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve)
    ws.addEventListener("error", reject)
  })
  return new Cdp(ws)
}

async function main() {
  const server = await startServer()
  const profile = await mkdtemp(join(tmpdir(), "oma-e2e-"))
  const chromium = spawn(
    "chromium",
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      "--window-size=1500,1000",
      "about:blank",
    ],
    { stdio: "ignore" },
  )

  let cdp
  for (let i = 0; i < 60 && !cdp; i++) {
    await sleep(200)
    try {
      cdp = await connect()
    } catch {
      /* not up yet */
    }
  }
  if (!cdp) {
    console.error("chromium did not expose a debugging port")
    chromium.kill()
    server.close()
    process.exit(1)
  }

  const shutdown = () => {
    try {
      chromium.kill()
    } catch {
      /* gone */
    }
    server.close()
  }
  process.on("exit", shutdown)

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" })
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true })
  const s = (method, params) => cdp.send(method, params, sessionId)

  await s("Page.enable")
  await s("Runtime.enable")
  await s("Log.enable")
  await s("Emulation.setDeviceMetricsOverride", { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false })

  const errors = []
  cdp.ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data)
    if (data.method === "Runtime.exceptionThrown") {
      errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text)
    }
    if (data.method === "Log.entryAdded" && data.params.entry.level === "error") {
      errors.push(data.params.entry.text)
    }
  })

  const evaluate = async (expression) => {
    const result = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "evaluate failed")
    return result.result.value
  }

  const waitFor = async (expression, timeout = 3000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return true
      await sleep(60)
    }
    return false
  }

  const click = async (selector) => {
    const ok = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return false
      el.click()
      return true
    })()`)
    if (!ok) throw new Error(`nothing to click: ${selector}`)
    await sleep(120)
  }

  // A real pointer tap: pointerdown/up at the element's centre, so gesture
  // targets (the pill, the dock, tiles) behave as they do under a finger.
  const tap = async (selector) => {
    const box = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })()`)
    if (!box) throw new Error(`nothing to tap: ${selector}`)
    await s("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", buttons: 1, clickCount: 1 })
    await sleep(30)
    await s("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", buttons: 0, clickCount: 1 })
    await sleep(220)
  }

  // Touch, not mouse: what a finger sends on Android.
  const touchTap = async (selector) => {
    const box = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })()`)
    if (!box) throw new Error(`nothing to touch: ${selector}`)
    await s("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x, y: box.y, id: 1 }] })
    await sleep(40)
    await s("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    await sleep(260)
  }

  const touchDrag = async (selector, from, to) => {
    const box = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })()`)
    if (!box) throw new Error(`nothing to drag: ${selector}`)
    const p1 = { x: box.x + box.w * from[0], y: box.y + box.h * from[1] }
    const p2 = { x: box.x + box.w * to[0], y: box.y + box.h * to[1] }
    await s("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: p1.x, y: p1.y, id: 1 }] })
    for (let i = 1; i <= 14; i++) {
      const t = i / 14
      await s("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t, id: 1 }] })
      await sleep(12)
    }
    await s("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    await sleep(450)
  }

  const drag = async (selector, fromRatio, toRatio, steps = 12) => {
    const box = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })()`)
    if (!box) throw new Error(`nothing to drag: ${selector}`)
    const from = { x: box.x + box.w * fromRatio[0], y: box.y + box.h * fromRatio[1] }
    const to = { x: box.x + box.w * toRatio[0], y: box.y + box.h * toRatio[1] }
    await s("Input.dispatchMouseEvent", { type: "mousePressed", x: from.x, y: from.y, button: "left", buttons: 1, clickCount: 1 })
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      await s("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        button: "left",
        buttons: 1,
      })
      await sleep(12)
    }
    await s("Input.dispatchMouseEvent", { type: "mouseReleased", x: to.x, y: to.y, button: "left", buttons: 0, clickCount: 1 })
    await sleep(420)
  }

  console.log(`\nLoading http://localhost:${PORT}/?quiet=1`)
  await s("Page.navigate", { url: `http://localhost:${PORT}/?quiet=1` })
  await sleep(900)

  const screen = () => evaluate("document.body.dataset.screen")
  await evaluate(`window.__errs = []; window.addEventListener('error', (e) => window.__errs.push(String(e.message))); window.addEventListener('unhandledrejection', (e) => window.__errs.push('rejection: ' + String(e.reason)))`)

  console.log("\nLock screen and PIN pad")
  await evaluate("localStorage.clear()")
  await s("Page.reload")
  await sleep(900)
  check("starts locked", (await screen()) === "lock", await screen())
  check("lock shows the notification stack", await evaluate("document.querySelectorAll('#lock .notification').length >= 2"))
  await click(".lock__hint")
  check("tapping the hint raises the PIN pad", await waitFor("!!document.querySelector('.pin')"))
  for (const digit of ["1", "2", "3", "4"]) await tap(`.pin__key[aria-label="${digit}"]`)
  check("four digits unlock", await waitFor("document.body.dataset.screen !== 'lock'", 2500))
  check("the status bar appears after unlocking", await evaluate("!!document.querySelector('.statusbar') && !document.querySelector('.statusbar').classList.contains('is-hidden')"))

  console.log("\nHome screen")
  check("two pages of widgets render", (await evaluate("document.querySelectorAll('.widget').length")) >= 5)
  check("the dock has four apps", (await evaluate("document.querySelectorAll('.dock__app').length")) === 4)
  check("unread badges are on Messages and Phone", await evaluate("[...document.querySelectorAll('.dock__app')].some(b => b.querySelector('.badge'))"))
  await drag("#home-viewport", [0.8, 0.5], [0.15, 0.5])
  check("swiping sideways pages the home screens", (await evaluate("document.querySelector('.page-dots .is-active')?.getAttribute('aria-label')")) === "Home screen 2")
  await drag("#home-viewport", [0.2, 0.5], [0.85, 0.5])
  check("and back", (await evaluate("document.querySelector('.page-dots .is-active')?.getAttribute('aria-label')")) === "Home screen 1")

  console.log("\nMessages")
  await tap('.dock__app[aria-label^="Messages"]')
  check("Messages opens from the dock", (await screen()) === "app-messages", await screen())
  check("with six threads", (await evaluate("document.querySelectorAll('.thread-row').length")) === 6)
  await tap(".thread-row")
  check("a thread opens", await evaluate("!!document.querySelector('.composer input')"))
  check("opening a thread clears its unread count", await evaluate("!document.querySelector('.thread-row.is-unread')"))
  await evaluate(`(() => {
    const input = document.querySelector('.composer input')
    input.value = 'see you saturday'
    document.querySelector('.composer__send').click()
  })()`)
  check("a sent message appears at once", await waitFor("[...document.querySelectorAll('.bubble--out')].some(b => b.textContent.includes('see you saturday'))"))
  check("and is marked delivered by the demo", await waitFor("[...document.querySelectorAll('.bubble--out')].some(b => b.textContent.includes('see you saturday') && b.textContent.includes('delivered'))", 4000))
  await tap(".app__back")
  check("back returns to the list", await evaluate("!!document.querySelector('.thread-row')"))

  console.log("\nThe pill")
  // A redraw of the same screen must not replay the app's entrance: the node
  // the finger sees has to stay the same one.
  await evaluate("window.__appNode = document.querySelector('.app')")
  await evaluate("window.__omaDemo.store.set({ page: 1 })")
  await sleep(200)
  check(
    "a redraw elsewhere leaves the app alone",
    await evaluate("window.__appNode === document.querySelector('.app')"),
    JSON.stringify(await evaluate("({ app: window.__omaDemo.store.get().app?.id, kids: document.getElementById('app-layer').childElementCount })")),
  )
  await evaluate("window.__omaDemo.store.set({ page: 0 })")
  // A real content change, which does redraw the app layer.
  await evaluate("const st = window.__omaDemo.store; st.set({ threads: st.get().threads.map((t, i) => (i === 0 ? { ...t, unread: t.unread + 1 } : t)) })")
  await sleep(250)
  check(
    "a redraw of the app itself does not replay its entrance",
    await evaluate("!document.querySelector('.app').classList.contains('app--enter')"),
    await evaluate("document.querySelector('.app').className"),
  )
  await tap("#pill-strip")
  check("tapping the pill goes home", (await screen()) === "home", await screen())

  console.log("\nShade")
  await drag("#home-viewport", [0.5, 0.2], [0.5, 0.95])
  check("pulling down opens the shade", (await screen()) === "shade", await screen())
  check("with the notifications on top", (await evaluate("document.querySelectorAll('#shade .notification').length")) >= 4)
  check("and eight tiles", (await evaluate("document.querySelectorAll('#shade .tile').length")) === 8)
  const beforeDnd = await evaluate(`document.querySelector('#shade .tile[aria-pressed]').getAttribute('aria-pressed')`)
  await tap("#shade .tile")
  check("tapping a tile toggles it", (await evaluate(`document.querySelector('#shade .tile[aria-pressed]').getAttribute('aria-pressed')`)) !== beforeDnd)
  await tap("#shade .tile") // put it back
  await drag("#sliders .slider:first-child .slider__track", [0.1, 0.5], [0.75, 0.5])
  const brightness = await evaluate("window.__omaDemo.store.get().brightness")
  check("dragging the brightness slider moves it", Number.isFinite(brightness) && brightness > 55 && brightness < 85, String(brightness))
  await drag("#shade-panel", [0.5, 0.97], [0.5, 0.2])
  check("dragging the handle up closes it", (await screen()) === "home", await screen())
  check("tapping the wallpaper closes the shade", (await screen()) === "home", await screen())

  console.log("\nThemes")
  await drag(".dock", [0.5, 0.5], [0.5, -1.1])
  check(
    "the drawer opens again from the dock",
    (await screen()) === "drawer",
    JSON.stringify(
      await evaluate(`(() => {
        const dock = document.querySelector('.dock').getBoundingClientRect()
        const at = document.elementFromPoint(dock.x + dock.width / 2, dock.y + dock.height / 2)
        return { screen: document.body.dataset.screen, drawer: window.__omaDemo.store.get().drawer, at: at ? (at.className || at.tagName) : null, hash: location.hash, errs: (window.__errs || []).slice(-3) }
      })()`),
    ),
  )
  await evaluate(`(() => { const i = document.querySelector('#drawer input'); i.value = 'appear'; i.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await tap("#drawer .drawer__app")
  check("Appearance opens from the drawer", (await screen()) === "app-appearance", await screen())
  check("Appearance lists every theme", (await evaluate("document.querySelectorAll('.appearance__card').length")) >= 10)
  await evaluate(`document.querySelectorAll('.appearance__card')[2].click()`)
  const theme = await evaluate("document.documentElement.dataset.theme")
  check("picking a theme applies it", theme !== "tokyo-night", theme)
  check("the wallpaper changed with it", await evaluate("document.querySelector('#wallpaper').style.backgroundImage.length > 100"))
  await tap("#pill-strip")

  console.log("\nDrawer")
  await drag(".dock", [0.5, 0.5], [0.5, -1.1])
  check("swiping up on the dock opens the drawer", (await screen()) === "drawer", await screen())
  await evaluate(`(() => { const i = document.querySelector('#drawer input'); i.value = 'mes'; i.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  check("the drawer searches", (await evaluate("document.querySelectorAll('.drawer__app').length")) === 1)
  await drag("#drawer", [0.5, 0.2], [0.5, 0.85])
  check("swiping down closes it", (await screen()) === "home", await screen())

  console.log("\nEdge swipe back and persistence")
  await tap('.dock__app[aria-label^="Contacts"]')
  check("Contacts opens", (await screen()) === "app-contacts")
  await drag("#app-layer", [0.01, 0.5], [0.5, 0.5])
  check("an edge swipe goes back home", (await screen()) === "home", await screen())
  await s("Page.reload")
  await sleep(900)
  check("the theme survives a reload", (await evaluate("document.documentElement.dataset.theme")) === theme)
  check("the sent message survives a reload", await waitFor("window.__omaDemo && window.__omaDemo.store.get().threads.some(t => t.messages.some(m => m.text === 'see you saturday'))", 2500))

  console.log("\nA handset in landscape")
  await s("Emulation.setDeviceMetricsOverride", { width: 740, height: 380, deviceScaleFactor: 2, mobile: true })
  await sleep(500)
  check("the frame goes away on a small screen", await evaluate("document.body.classList.contains('fill')"))
  check("portrait while rotation is locked", await evaluate("!document.body.classList.contains('rotated')"))
  await evaluate(`(() => { const store = window.__omaDemo.store; store.set({ shade: true }); })()`)
  await sleep(200)
  await evaluate(`[...document.querySelectorAll('#shade .tile')].find((t) => t.textContent.includes('Rotation lock')).click()`)
  await sleep(400)
  check("unlocking rotation turns the screen over", await evaluate("document.body.classList.contains('rotated')"))
  await s("Emulation.setDeviceMetricsOverride", { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false })
  await sleep(300)

  console.log("\nAs a handset, with touch")
  await s("Emulation.setDeviceMetricsOverride", { width: 412, height: 915, deviceScaleFactor: 2.6, mobile: true })
  await s("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 })
  await s("Page.navigate", { url: `http://localhost:${PORT}/?quiet=1#lock` })
  await sleep(1100)
  await evaluate("localStorage.clear()")
  await s("Page.reload")
  await sleep(1100)
  check("a handset gets the frame-less screen", await evaluate("document.body.classList.contains('fill')"))
  await touchTap(".lock__hint")
  check("a finger raises the PIN pad", await waitFor("!!document.querySelector('.pin')"))
  for (const digit of ["1", "2", "3", "4"]) await touchTap(`.pin__key[aria-label="${digit}"]`)
  check("and unlocks it", await waitFor("document.body.dataset.screen === 'home'", 2500))
  await touchDrag("#home-viewport", [0.5, 0.25], [0.5, 0.9])
  check("a finger pull opens the shade", (await screen()) === "shade", await screen())
  await touchDrag("#shade-panel", [0.5, 0.95], [0.5, 0.1])
  check("and a finger push closes it", (await screen()) === "home", await screen())
  await touchDrag(".dock", [0.5, 0.5], [0.5, -1.1])
  check("a finger swipe up on the dock opens the drawer", (await screen()) === "drawer", await screen())

  console.log("\nInstallable on Android")
  const manifest = await evaluate(`fetch('manifest.webmanifest').then((r) => r.json())`)
  check("the manifest names the app", manifest?.name === "Omamobile demo" && manifest?.short_name === "Omamobile")
  check("it opens standalone", manifest?.display === "standalone")
  check("its scope is relative, so any subpath works", manifest?.scope === "./" && manifest?.start_url === "./#home")
  const icons = manifest?.icons || []
  check("192 and 512 icons, plus a maskable one", ["192x192", "512x512"].every((s) => icons.some((i) => i.sizes === s)) && icons.some((i) => i.purpose === "maskable"))
  check("screenshots for the install sheet", (manifest?.screenshots || []).length >= 2)
  const assets = [...icons.map((i) => i.src), ...(manifest?.screenshots || []).map((s) => s.src), ...(manifest?.shortcuts || []).flatMap((s) => s.icons.map((i) => i.src))]
  const missing = await evaluate(`Promise.all(${JSON.stringify(assets)}.map((p) => fetch(p).then((r) => r.ok ? null : p).catch(() => p))).then((r) => r.filter(Boolean))`)
  check("every icon and screenshot loads", (missing || []).length === 0, JSON.stringify(missing))
  await s("Page.navigate", { url: `http://localhost:${PORT}/?quiet=1#home` })
  await sleep(1200)
  const controlledNow = await evaluate("!!navigator.serviceWorker.controller")
  check("the service worker controls the page offline", controlledNow)
  const offline = await evaluate(`caches.open('oma-demo-v4').then((c) => c.keys()).then((k) => k.some((r) => r.url.endsWith('js/main.js')))`)
  check("with the shell precached", offline)
  await s("Emulation.setTouchEmulationEnabled", { enabled: false })
  await s("Emulation.setDeviceMetricsOverride", { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false })

  console.log("\nService worker")
  const controlled = await evaluate("navigator.serviceWorker.getRegistrations().then(r => r.length)")
  check("the service worker registers", controlled >= 1, String(controlled))

  check("no uncaught errors logged", errors.length === 0, errors.slice(0, 3).join(" | "))

  console.log(`\n${pass} passed, ${fail} failed`)
  if (fail) console.log(failures.map((f) => ` - ${f}`).join("\n"))

  shutdown()
  process.exit(fail ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
