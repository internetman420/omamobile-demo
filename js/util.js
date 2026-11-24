// SPDX-License-Identifier: MIT
// Small helpers shared by every module. No dependencies, no build step.

/** Build a DOM element. `class`/`className`, `style` objects, `on*` handlers,
 *  `html` for trusted markup and `dataset` objects are understood. */
export function h(tag, props, ...children) {
  if (tag === "frag") {
    const f = document.createDocumentFragment()
    append(f, children)
    return f
  }
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue
    if (key === "class" || key === "className") el.className = value
    else if (key === "style" && typeof value === "object") Object.assign(el.style, value)
    else if (key === "html") el.innerHTML = value
    else if (key === "dataset") Object.assign(el.dataset, value)
    else if (key === "ref" && typeof value === "function") value(el)
    else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value)
    } else if (key === "value" || key === "checked" || key === "disabled") el[key] = value
    else el.setAttribute(key, value === true ? "" : value)
  }
  append(el, children)
  return el
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === undefined || child === null || child === false) continue
    el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)))
  }
}

/** Replace an element's children in one pass. */
export function fill(el, ...children) {
  el.replaceChildren()
  append(el, children)
  return el
}

export const $ = (sel, root = document) => root.querySelector(sel)

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
export const lerp = (a, b, t) => a + (b - a) * t

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** localStorage that never throws (private windows, storage disabled). */
export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`oma-demo:${key}`)
      return raw === null ? fallback : JSON.parse(raw)
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`oma-demo:${key}`, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(`oma-demo:${key}`)
    } catch {
      /* ignore */
    }
  },
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])
}

const pad = (n) => String(n).padStart(2, "0")

/** "8:48 AM" as the phone's quick settings show it. */
export function time12(date = new Date()) {
  const hours = date.getHours() % 12 || 12
  return `${hours}:${pad(date.getMinutes())} ${date.getHours() < 12 ? "AM" : "PM"}`
}

/** "Mon Oct 26, 8:53 AM" for the status bar. */
export function statusTime(date = new Date()) {
  const day = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  return `${day}  ${time12(date)}`
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export function longDate(date = new Date()) {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`
}

export function shortWeekday(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase()
}

export function relativeDay(ms, now = Date.now()) {
  const d = new Date(ms)
  const today = new Date(now)
  const days = Math.floor((startOfDay(today) - startOfDay(d)) / 86400000)
  if (days === 0) return time12(d)
  if (days === 1) return "Yesterday"
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" })
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}

/** Stable hue per name, for avatar colours drawn from the theme's palette. */
export function hashHue(text) {
  let n = 0
  for (let i = 0; i < text.length; i++) n = (n * 31 + text.charCodeAt(i)) % 360
  return n
}

export function vibrate(pattern = 8) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}

export function announce(message) {
  const region = document.getElementById("live-region")
  if (region) region.textContent = message
}

export function formatPhone(number) {
  const digits = number.replace(/\D/g, "")
  if (digits.length === 11) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return number
}

export function debounce(fn, ms = 120) {
  let t = 0
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
