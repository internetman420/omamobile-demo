// SPDX-License-Identifier: MIT
// The demo's single store. Every screen reads from here and every interaction
// writes here; a microtask-batched subscription redraws what changed.

import * as demo from "./data.js"
import { storage } from "./util.js"
import { DEFAULT_THEME } from "./themes.generated.js"

const SAVE_KEY = "state"
const SAVE_VERSION = 3

function freshState() {
  const now = Date.now()
  return {
    // session
    unlocked: false,
    pinOpen: false,
    pinBuffer: "",
    pinError: false,
    screenOff: false,
    page: 0,
    shade: false,
    shadePage: 0,
    drawer: false,
    drawerQuery: "",
    switcher: false,
    sheet: null, // { kind, ... }
    app: null, // { id, params }
    appBack: [], // stack of app states for in-app navigation
    recent: ["messages", "phone", "contacts", "appearance"], // newest first; the switcher
    rotation: "portrait", // portrait | landscape (rotation lock tile)
    // appearance
    theme: DEFAULT_THEME,
    wallpaper: true,
    // shell state
    tiles: demo.tiles(),
    brightness: 50,
    volume: 95,
    battery: { level: 97, charging: true },
    // data stores
    contacts: demo.contacts(),
    threads: demo.threads(now),
    calls: demo.calls(now),
    notifications: demo.notifications(now),
    media: { ...demo.MEDIA },
    // transient
    toasts: [],
    booted: false,
    clock: now,
  }
}

/** Load what should survive a reload: the theme, and the demo stores the
 *  visitor changed by using the phone (threads, calls, notifications). */
function loadSaved(state) {
  const saved = storage.get(SAVE_KEY, null)
  if (!saved || saved.version !== SAVE_VERSION) return state
  if (saved.theme) state.theme = saved.theme
  if (typeof saved.wallpaper === "boolean") state.wallpaper = saved.wallpaper
  if (saved.threads) state.threads = saved.threads
  if (saved.calls) state.calls = saved.calls
  if (saved.notifications) state.notifications = saved.notifications
  if (saved.tiles) state.tiles = saved.tiles
  return state
}

class Store {
  constructor() {
    this.state = loadSaved(freshState())
    this.listeners = new Set()
    this.pending = false
    this.saveTimer = 0
  }

  get() {
    return this.state
  }

  /** Shallow patch plus redraw. */
  set(patch) {
    const next = typeof patch === "function" ? patch(this.state) : patch
    Object.assign(this.state, next)
    this.emit()
  }

  /** Redraw without changing state (the clock, for instance). */
  touch() {
    this.emit()
  }

  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit() {
    if (this.pending) return
    this.pending = true
    queueMicrotask(() => {
      this.pending = false
      for (const fn of this.listeners) fn(this.state)
      this.scheduleSave()
    })
  }

  scheduleSave() {
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.save(), 400)
  }

  save() {
    const s = this.state
    storage.set(SAVE_KEY, {
      version: SAVE_VERSION,
      theme: s.theme,
      wallpaper: s.wallpaper,
      threads: s.threads,
      calls: s.calls,
      notifications: s.notifications,
      tiles: s.tiles,
    })
  }

  /** Throw away everything the visitor changed and start from the dataset. */
  reset() {
    storage.remove(SAVE_KEY)
    const theme = this.state.theme
    this.state = loadSaved(freshState())
    this.state.unlocked = true
    this.state.theme = theme
    this.emit()
  }
}

export const store = new Store()

// ---- derived values -------------------------------------------------------

export const tile = (id) => store.get().tiles.find((t) => t.id === id)
export const isOn = (id) => !!tile(id)?.on
export const dnd = () => isOn("dnd")

export function unreadThreads() {
  return store.get().threads.filter((t) => t.unread > 0)
}

export function unreadCount() {
  return store.get().threads.reduce((n, t) => n + t.unread, 0)
}

export function missedCalls() {
  return store.get().calls.filter((c) => c.direction === "in" && c.outcome === "missed" && !c.seen)
}

export function unreadNotifications() {
  return store.get().notifications.filter((n) => !n.read).length
}

export function contactById(id) {
  return store.get().contacts.find((c) => c.id === id) || null
}

export function threadById(id) {
  return store.get().threads.find((t) => t.id === id) || null
}

export function titleForThread(thread) {
  const contact = thread.contactId ? contactById(thread.contactId) : null
  return contact?.name || thread.address
}

export function titleForCall(call) {
  const contact = call.contactId ? contactById(call.contactId) : null
  return contact?.name || call.address
}

// ---- actions --------------------------------------------------------------

export function unlock() {
  store.set({ unlocked: true, pinOpen: false, pinBuffer: "", pinError: false, screenOff: false })
}

export function lock() {
  store.set({ unlocked: false, pinOpen: false, pinBuffer: "", shade: false, drawer: false, switcher: false, app: null, sheet: null })
}

export function openApp(id, params = {}) {
  const app = demo.apps().find((a) => a.id === id)
  if (app && app.app === "placeholder") {
    store.set({ sheet: { kind: "desktop-app", app } })
    return
  }
  store.set((s) => ({
    app: { id, params },
    appBack: [],
    recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, 5),
    drawer: false,
    switcher: false,
    sheet: null,
    shade: false,
  }))
  if (id === "messages" && params.thread) markThreadRead(params.thread)
  if (id === "phone") markCallsSeen()
}

export function openThread(threadId) {
  const { app } = store.get()
  const back = app ? [...store.get().appBack, app] : []
  store.set({ app: { id: "messages", params: { thread: threadId } }, appBack: back })
  markThreadRead(threadId)
}

export function appBack() {
  const { appBack: stack } = store.get()
  if (stack.length) {
    const prev = stack[stack.length - 1]
    store.set({ app: prev, appBack: stack.slice(0, -1) })
  } else {
    goHome()
  }
}

export function goHome() {
  store.set({ app: null, appBack: [], drawer: false, switcher: false, sheet: null, shade: false })
}

export function markThreadRead(threadId) {
  store.set((s) => ({
    threads: s.threads.map((t) => (t.id === threadId ? { ...t, unread: 0, messages: t.messages.map((m) => ({ ...m, read: true })) } : t)),
    notifications: s.notifications.map((n) => (n.thread === threadId ? { ...n, read: true } : n)),
  }))
}

export function markCallsSeen() {
  store.set((s) => ({
    calls: s.calls.map((c) => (c.seen ? c : { ...c, seen: true })),
    notifications: s.notifications.map((n) => (n.kind === "call" ? { ...n, read: true } : n)),
  }))
}

let messageSeq = 0

export function sendMessage(threadId, text) {
  const body = text.trim()
  if (!body) return
  const id = `out-${Date.now()}-${messageSeq++}`
  const message = { id, dir: "out", text: body, at: Date.now(), state: "sending", read: true }
  store.set((s) => ({
    threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, message] } : t)),
  }))
  // No modem here: the message is delivered by the demo, one tick at a time.
  setTimeout(() => {
    store.set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === id ? { ...m, state: "sent" } : m)) } : t,
      ),
    }))
  }, 700)
  setTimeout(() => {
    store.set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === id ? { ...m, state: "delivered" } : m)) } : t,
      ),
    }))
  }, 1700)
}

export function toggleTile(id) {
  const current = tile(id)
  if (!current || current.disabled) return false
  if (current.action === "theme") {
    store.set({ sheet: { kind: "theme" }, shade: false })
    return true
  }
  const on = !current.on
  store.set((s) => ({
    tiles: s.tiles.map((t) => (t.id === id ? { ...t, on, detail: detailFor(t, on) } : t)),
  }))
  return on
}

function detailFor(t, on) {
  switch (t.id) {
    case "wifi":
      return on ? "Connected" : "Off"
    case "bluetooth":
      return on ? "On" : "Off"
    case "dnd":
      return on ? "On" : "Off"
    case "torch":
      return on ? "No lamp on this device" : "Off"
    case "rotation":
      return on ? "Locked" : "Auto-rotate"
    case "airplane":
      return on ? "On" : "Off"
    case "location":
      return on ? "On" : "Off"
    case "night":
      return on ? "On" : "Off"
    case "screensaver":
      return on ? "Lock after 1 min" : "Off"
    case "dictation":
      return on ? "Listening" : "Voxtype"
    default:
      return t.detail
  }
}

export function dismissNotification(id) {
  store.set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }))
}

export function clearNotifications() {
  store.set({ notifications: [], toasts: [] })
}

export function openNotification(n) {
  store.set((s) => ({
    notifications: s.notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
    shade: false,
    toasts: s.toasts.filter((t) => t.id !== n.id),
  }))
  if (n.kind === "message" && n.thread) openThread(n.thread)
  else if (n.kind === "call") openApp("phone")
  else if (n.kind === "calendar") openApp("calendar")
  else if (n.kind === "system") store.set({ sheet: { kind: "update" } })
}

/** A heads-up toast. Suppressed while Do not disturb is on, as on the phone. */
let toastTimer = 0
export function toast(notification) {
  if (dnd()) return
  const entry = { ...notification, id: notification.id || `toast-${Date.now()}` }
  store.set((s) => ({ toasts: [...s.toasts.filter((t) => t.id !== entry.id), entry].slice(-3) }))
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    store.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== entry.id) }))
  }, 5200)
}

export function dismissToast(id) {
  store.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}

export function setTheme(id) {
  store.set({ theme: id })
}

export function toggleWallpaper() {
  store.set((s) => ({ wallpaper: !s.wallpaper }))
}

export function setPage(page) {
  store.set({ page })
}

export function tick() {
  store.state.clock = Date.now()
  store.touch()
}

export { demo }
