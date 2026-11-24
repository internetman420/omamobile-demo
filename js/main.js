// SPDX-License-Identifier: MIT
// Bootstrap: theme, scale, the render pass, every screen-level gesture, the
// keyboard, deep links and the install prompt.

import { h, fill, clamp, sleep, vibrate, announce } from "./util.js"
import { icon } from "./icons.js"
import { store, lock, goHome, appBack, openApp, toast, isOn } from "./store.js"
import { applyTheme, wallpaperFor, THEMES, swatchFor } from "./theme.js"
import { attachDrag, attachLongPress } from "./gestures.js"
import { renderStatusBar } from "./statusbar.js"
import { renderHome } from "./home.js"
import { renderApp } from "./apps.js"
import { renderPill } from "./pill.js"
import { renderDrawer } from "./drawer.js"
import { renderSwitcher } from "./switcher.js"
import { renderShade } from "./shade.js"
import { renderLock, pressDigit, pressBackspace, openPin } from "./lock.js"
import { renderToasts } from "./toasts.js"
import { renderSheets } from "./sheets.js"

const L = {
  stage: document.getElementById("stage"),
  wallpaper: document.getElementById("wallpaper"),
  home: document.getElementById("home-layer"),
  app: document.getElementById("app-layer"),
  pill: document.getElementById("pill-layer"),
  drawer: document.getElementById("drawer-layer"),
  switcher: document.getElementById("switcher-layer"),
  status: document.getElementById("status-layer"),
  shade: document.getElementById("shade-layer"),
  lock: document.getElementById("lock-layer"),
  toasts: document.getElementById("toast-layer"),
  sheets: document.getElementById("sheet-layer"),
  hud: document.getElementById("hud"),
}

const DESIGN_W = 720
const DESIGN_H = 1560
const SHADE_TRAVEL = DESIGN_H * 0.62
let scale = 1

// ---- layout ---------------------------------------------------------------

function layout() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true
  const fillMode = standalone || window.innerWidth < 760
  document.body.classList.toggle("fill", fillMode)

  const hudVisible = !fillMode && window.innerWidth >= 1080 && window.innerHeight >= 700
  if (L.hud) L.hud.hidden = !hudVisible

  const bezel = fillMode ? 0 : 22
  // Rotation lock off, a handset in landscape: the screen turns over.
  const rotated = fillMode && !isOn("rotation") && window.innerWidth > window.innerHeight
  document.body.classList.toggle("rotated", rotated)

  const availW = fillMode ? window.innerWidth : window.innerWidth - (hudVisible ? 360 + 56 + 48 : 48)
  const availH = fillMode ? window.innerHeight : window.innerHeight - 48
  const [w, h] = rotated ? [DESIGN_H + bezel, DESIGN_W + bezel] : [DESIGN_W + bezel, DESIGN_H + bezel]
  scale = Math.max(0.15, Math.min(availW / w, availH / h))
  L.stage.style.setProperty("--s", String(scale))
}

// ---- render ---------------------------------------------------------------

let lastTheme = null
let lastWallpaper = null
let pendingFocus = null

function captureFocus() {
  const el = document.activeElement
  if (!el || !el.dataset || !el.dataset.focus) return
  pendingFocus = { key: el.dataset.focus, start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
}

function restoreFocus() {
  if (!pendingFocus) return
  const { key, start, end } = pendingFocus
  pendingFocus = null
  const el = document.querySelector(`[data-focus="${key}"]`)
  if (!el) return
  el.focus({ preventScroll: true })
  try {
    el.setSelectionRange(start, end)
  } catch {
    /* not a text input */
  }
}

function render(state) {
  if (state.theme !== lastTheme) {
    applyTheme(state.theme)
    lastTheme = state.theme
    renderHud(state)
  }
  const wpKey = `${state.wallpaper}:${state.theme}`
  if (wpKey !== lastWallpaper) {
    L.wallpaper.style.backgroundImage = state.wallpaper ? `url("${wallpaperFor(state.theme)}")` : ""
    L.wallpaper.classList.toggle("is-plain", !state.wallpaper)
    lastWallpaper = wpKey
  }

  renderStatusBar(L.status, state)
  renderHome(L.home, state)
  renderApp(L.app, state)
  renderPill(L.pill, state)
  renderDrawer(L.drawer, state, { focus: state.drawer })
  renderSwitcher(L.switcher, state)
  renderShade(L.shade, state, { setShade })
  renderLock(L.lock, state)
  renderToasts(L.toasts, state)
  renderSheets(L.sheets, state)

  document.body.dataset.screen = !state.unlocked
    ? "lock"
    : state.sheet
      ? "sheet"
      : state.shade
        ? "shade"
        : state.switcher
          ? "switcher"
          : state.drawer
            ? "drawer"
            : state.app
              ? `app-${state.app.id}`
              : "home"
  restoreFocus()
  updateHash(state)
}

let lastRotationLock = null
store.subscribe((state) => {
  // Rotation lock lives in the quick settings tiles; flipping it re-frames.
  if (isOn("rotation") !== lastRotationLock) {
    lastRotationLock = isOn("rotation")
    layout()
  }
  captureFocus()
  render(state)
})

// ---- clock ----------------------------------------------------------------

function tickClock() {
  const now = new Date()
  store.state.clock = now.getTime()
  const bar = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + "  " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  for (const el of document.querySelectorAll('[data-clock="status"]')) el.textContent = bar
  const big = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  for (const el of document.querySelectorAll('[data-clock="shade"]')) el.textContent = big
  for (const el of document.querySelectorAll('[data-clock="lock"]')) el.textContent = big.replace(/\s?[AP]M$/i, "")
}

// ---- shade helpers --------------------------------------------------------

function setShade(open) {
  clearShadeInline()
  if (!open) {
    // Let the panel animate up before the state drops its pointer events.
    const shade = document.querySelector(".shade")
    const panel = document.querySelector(".shade__panel")
    if (shade && panel && store.get().shade) {
      panel.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)"
      shade.style.transition = "opacity 220ms cubic-bezier(.2,.8,.2,1)"
      panel.style.transform = "translateY(-100%)"
      shade.style.opacity = "0"
    }
  }
  store.set({ shade: open })
}

function clearShadeInline() {
  const panel = document.querySelector(".shade__panel")
  const shade = document.querySelector(".shade")
  if (panel) {
    panel.style.transition = ""
    panel.style.transform = ""
  }
  if (shade) {
    shade.style.transition = ""
    shade.style.opacity = ""
    shade.classList.remove("is-previewing")
  }
}

function previewShade(progress, open) {
  const panel = document.querySelector(".shade__panel")
  const shade = document.querySelector(".shade")
  if (!panel || !shade) return
  // A previewing shade is visible but not yet interactive: it must not take
  // the pointer away from the finger that is still pulling it down.
  if (!open) shade.classList.add("is-previewing")
  panel.style.transition = "none"
  shade.style.transition = "none"
  panel.style.transform = `translateY(-${(1 - clamp(progress, 0, 1)) * 100}%)`
  shade.style.opacity = String(clamp(progress, 0, 1))
}

// ---- gestures -------------------------------------------------------------

function wireGestures() {
  const wasOpen = { value: false }
  let startX = 0

  // Home: pull down for the shade, up for the drawer, sideways to page.
  attachDrag(L.home, {
    scale: () => scale,
    onStart: () => {
      wasOpen.value = store.get().shade
    },
    onMove: ({ axis, dx, rawDy }) => {
      if (axis === "x") {
        const track = document.getElementById("home-track")
        if (!track) return
        track.style.transition = "none"
        track.style.transform = `translateX(calc(${-store.get().page * (100 / 3)}% + ${dx}px))`
        return
      }
      if (axis === "y" && rawDy > 0) previewShade(rawDy / SHADE_TRAVEL, true)
    },
    onEnd: ({ axis, dx, rawDy, vx, vy, tap }) => {
      if (tap) return
      if (axis === "x") {
        const page = store.get().page
        const far = Math.abs(dx) > 120 || Math.abs(vx) > 520
        const next = far ? clamp(page + (dx < 0 ? 1 : -1), 0, 2) : page
        store.set({ page: next })
        requestAnimationFrame(() => {
          const track = document.getElementById("home-track")
          if (track) {
            track.style.transition = ""
            track.style.transform = `translateX(-${next * (100 / 3)}%)`
          }
        })
        return
      }
      clearShadeInline()
      if (rawDy > 130 || vy > 620) setShade(true)
      else if (rawDy < -80 || vy < -450) store.set({ drawer: true })
    },
  })

  // The status bar: tap or pull it for the shade.
  attachDrag(L.status, {
    scale: () => scale,
    onMove: ({ axis, rawDy }) => {
      if (axis === "y" && rawDy > 0) previewShade(rawDy / SHADE_TRAVEL, true)
    },
    onEnd: ({ tap, axis, rawDy, vy }) => {
      clearShadeInline()
      if (tap || (axis === "y" && (rawDy > 60 || vy > 600))) setShade(true)
    },
  })

  // The shade: drag the handle up to put it away.
  attachDrag(L.shade, {
    scale: () => scale,
    onMove: ({ axis, rawDy }) => {
      if (!store.get().shade) return
      if (axis === "y" && rawDy < 0) previewShade(1 + rawDy / SHADE_TRAVEL, false)
    },
    onEnd: ({ axis, rawDy, vy }) => {
      if (!store.get().shade) return
      if (axis !== "y") {
        clearShadeInline()
        return
      }
      if (rawDy < -90 || vy < -600) setShade(false)
      else clearShadeInline()
    },
  })

  // The drawer: drag down to close.
  attachDrag(L.drawer, {
    scale: () => scale,
    onMove: ({ axis, rawDy }) => {
      const el = document.getElementById("drawer")
      if (axis === "y" && rawDy > 0 && el) {
        el.style.transition = "none"
        el.style.transform = `translateY(${rawDy}px)`
      }
    },
    onEnd: ({ axis, rawDy, vy }) => {
      if (axis !== "y") return
      if (rawDy > 90 || vy > 700) {
        setShade(false)
        store.set({ drawer: false })
      } else {
        const el = document.getElementById("drawer")
        if (el) {
          el.style.transition = ""
          el.style.transform = ""
        }
      }
    },
  })

  // Recents: drag down to go back home.
  attachDrag(L.switcher, {
    scale: () => scale,
    axis: "y",
    onEnd: ({ rawDy, vy }) => {
      if (rawDy > 90 || vy > 700) store.set({ switcher: false })
    },
  })

  // The lock: swipe up, or tap, for the PIN pad.
  attachDrag(L.lock, {
    scale: () => scale,
    axis: "y",
    onEnd: ({ rawDy, vy, tap }) => {
      const state = store.get()
      if (state.unlocked || state.pinOpen) return
      if (tap || rawDy < -60 || vy < -500) openPin()
    },
  })

  // An app: swipe in from the left edge to go back.
  attachDrag(L.app, {
    scale: () => scale,
    onStart: ({ x }) => {
      startX = x
    },
    onMove: ({ axis, dx }) => {
      if (axis !== "x" || startX > 46) return
      const app = document.getElementById("app")
      if (app && dx > 0) {
        app.style.transition = "none"
        app.style.transform = `translateX(${dx}px)`
      }
    },
    onEnd: ({ axis, dx, vx }) => {
      const app = document.getElementById("app")
      if (app) {
        app.style.transition = ""
        app.style.transform = ""
      }
      if (axis !== "x" || startX > 46) return
      if (dx > 110 || vx > 600) back()
    },
  })

  // The pill: tap for home, swipe up (or hold) for recents.
  attachDrag(L.pill, {
    scale: () => scale,
    axis: "y",
    onEnd: ({ tap, rawDy }) => {
      const state = store.get()
      if (!state.app && !state.drawer) return
      if (tap) goHome()
      else if (rawDy < -40 || vy < -450) store.set({ switcher: true, drawer: false })
    },
  })
  attachLongPress(L.pill, () => {
    if (store.get().app) store.set({ switcher: true, drawer: false })
  })
}

function back() {
  const s = store.get()
  if (s.sheet) store.set({ sheet: null })
  else if (s.shade) setShade(false)
  else if (s.switcher) store.set({ switcher: false })
  else if (s.drawer) store.set({ drawer: false })
  else if (s.pinOpen) store.set({ pinOpen: false, pinBuffer: "" })
  else if (s.app) appBack()
}

// ---- keyboard -------------------------------------------------------------

function wireKeyboard() {
  window.addEventListener("keydown", (event) => {
    const state = store.get()
    const typing = /^(input|textarea|select)$/i.test(event.target?.tagName || "")
    if (event.key === "Escape") {
      if (typing) {
        event.target.blur()
        return
      }
      event.preventDefault()
      back()
      return
    }
    if (!state.unlocked) {
      if (state.pinOpen && /^[0-9]$/.test(event.key)) {
        event.preventDefault()
        pressDigit(event.key)
      } else if (state.pinOpen && event.key === "Backspace") {
        event.preventDefault()
        pressBackspace()
      } else if (!state.pinOpen && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault()
        openPin()
      }
      return
    }
    if (typing) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    switch (event.key.toLowerCase()) {
      case "arrowleft":
        event.preventDefault()
        store.set({ page: clamp(state.page - 1, 0, 2) })
        break
      case "arrowright":
        event.preventDefault()
        store.set({ page: clamp(state.page + 1, 0, 2) })
        break
      case "h":
        goHome()
        break
      case "l":
        lock()
        break
      case "q":
        setShade(!state.shade)
        break
      case "d":
        store.set({ drawer: !state.drawer })
        break
      case "r":
        store.set({ switcher: !state.switcher })
        break
      case "t":
        store.set({ sheet: state.sheet?.kind === "theme" ? null : { kind: "theme" } })
        break
      case "?":
        store.set({ sheet: { kind: "about" } })
        break
      default:
        break
    }
  })
}

// ---- deep links -----------------------------------------------------------

function applyHash() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ""))
  if (!hash) return
  const [kind, a, b] = hash.split("/")
  if (kind === "lock") {
    store.set({ unlocked: false, pinOpen: a === "pin", pinBuffer: a === "pin" ? "12" : "" })
    return
  }
  store.set({ unlocked: true, pinOpen: false })
  if (kind === "home") store.set({ page: Number(a) || 0 })
  else if (kind === "shade") store.set({ shade: true, notifications: store.get().notifications })
  else if (kind === "drawer") store.set({ drawer: true })
  else if (kind === "switcher") store.set({ switcher: true })
  else if (kind === "sheet") store.set({ sheet: { kind: a } })
  else if (kind === "app") {
    if (a === "messages" && b) openApp("messages", { thread: b })
    else openApp(a)
  }
}

let hashTimer = 0
function updateHash(state) {
  clearTimeout(hashTimer)
  hashTimer = setTimeout(() => {
    let hash = "#home"
    if (!state.unlocked) hash = "#lock"
    else if (state.sheet) hash = `#sheet/${state.sheet.kind}`
    else if (state.app) hash = `#app/${state.app.id}${state.app.params?.thread ? `/${state.app.params.thread}` : ""}`
    else if (state.shade) hash = "#shade"
    else if (state.drawer) hash = "#drawer"
    else if (state.switcher) hash = "#switcher"
    else if (state.page) hash = `#home/${state.page}`
    if (location.hash !== hash) history.replaceState(null, "", hash)
  }, 150)
}

// ---- install prompt -------------------------------------------------------

let deferredPrompt = null

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault()
  deferredPrompt = event
})

window.omaInstall = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    if (outcome === "accepted") announce("Installing the demo")
    return
  }
  const installed = window.matchMedia("(display-mode: standalone)").matches
  store.set({ sheet: { kind: "install", installed } })
}

// ---- the desktop's side panel --------------------------------------------

const HUD_KEYS = [
  ["← →", "home screens"],
  ["Q", "quick settings"],
  ["D", "app drawer"],
  ["R", "recent apps"],
  ["T", "themes"],
  ["H", "home"],
  ["L", "lock"],
  ["Esc", "back"],
]

function renderHud(state) {
  if (!L.hud) return
  fill(
    L.hud,
    h("div", { class: "hud__eyebrow" }, h("span", { class: "dot" }), "Unofficial demo"),
    h("h1", null, "Omarchy, ", h("span", null, "in your hand")),
    h(
      "p",
      null,
      "A browser recreation of ",
      h("strong", null, "Omamobile"),
      " — the phone profile of Omarchy 4.5's shell on a Pixel 7 Pro: Arch Linux ARM, Hyprland, Omarchy's own apps, no Android underneath. Nothing here touches a modem.",
    ),
    h(
      "div",
      { class: "hud__section" },
      h("h2", null, "Theme"),
      h(
        "div",
        { class: "hud__row" },
        THEMES.slice(0, 8).map((theme) => {
          const [bg, accent, extra] = swatchFor(theme.id)
          return h(
            "button",
            {
              type: "button",
              class: "hud-btn",
              title: theme.name,
              "aria-pressed": String(theme.id === state.theme),
              style: theme.id === state.theme ? { borderColor: "var(--accent)", color: "var(--fg-bright)" } : {},
              onclick: () => store.set({ theme: theme.id }),
            },
            h("span", { class: "swatch", "aria-hidden": "true" }, [bg, accent, extra].map((c) => h("span", { style: { background: c, width: "9px", height: "18px" } }))),
            theme.name,
          )
        }),
      ),
      h(
        "button",
        { type: "button", class: "hud-btn", style: { marginTop: "10px" }, onclick: () => store.set({ sheet: { kind: "theme" } }) },
        `All ${THEMES.length} themes`,
        h("span", { html: icon("chevron-right", { size: 16 }) }),
      ),
    ),
    h(
      "div",
      { class: "hud__section" },
      h("h2", null, "Demo"),
      h(
        "div",
        { class: "hud__row" },
        h("button", { type: "button", class: "hud-btn hud-btn--primary", onclick: () => window.omaInstall() }, h("span", { html: icon("plus", { size: 16 }) }), "Install as an app"),
        h("button", { type: "button", class: "hud-btn", onclick: () => store.set({ sheet: { kind: "about" } }) }, "About"),
        h("button", { type: "button", class: "hud-btn", onclick: () => store.set({ shade: true }) }, "Quick settings"),
        h("button", { type: "button", class: "hud-btn", onclick: () => store.set({ drawer: true }) }, "All apps"),
        h("button", { type: "button", class: "hud-btn", onclick: () => store.set({ sheet: { kind: "install" } }) }, "Windows and platforms"),
      ),
    ),
    h(
      "div",
      { class: "hud__section" },
      h("h2", null, "Keys"),
      h("div", { class: "hud-keys" }, HUD_KEYS.flatMap(([key, label]) => [h("kbd", null, key), h("span", null, label)])),
    ),
  )
}

// ---- boot -----------------------------------------------------------------

function boot() {
  layout()
  applyTheme(store.get().theme)
  lastTheme = store.get().theme
  renderHud(store.get())
  applyHash()
  captureFocus()
  render(store.get())
  wireGestures()
  wireKeyboard()

  window.addEventListener("resize", layout)
  window.addEventListener("orientationchange", () => setTimeout(layout, 120))
  setInterval(tickClock, 1000)
  window.addEventListener("hashchange", () => {
    if (location.hash) applyHash()
  })

  // One heads-up on the first unlock, so the notification system is not a
  // secret. It respects Do not disturb, like every other notification.
  let introduced = new URLSearchParams(location.search).has("quiet")
  store.subscribe((state) => {
    if (introduced || !state.unlocked) return
    introduced = true
    setTimeout(() => {
      const pending = store.get().notifications.filter((n) => !n.read)
      if (pending.length) toast(pending[0])
    }, 1600)
  })

  // Offline: register the service worker that precaches the whole phone.
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* a demo without offline still works */
      })
    })
  }

  window.__omaDemo = { store, sleep, vibrate }
}

boot()
