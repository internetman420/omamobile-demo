// SPDX-License-Identifier: MIT
// Theme plumbing: Omarchy's colour tokens become CSS custom properties, and
// the wallpaper is drawn from the same palette so that changing the theme
// changes the whole phone, the way it does on the real thing.

import { THEMES, DEFAULT_THEME } from "./themes.generated.js"

export { THEMES }

export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES.find((t) => t.id === DEFAULT_THEME) || THEMES[0]

const TOKEN_VARS = {
  background: "--bg",
  dark_background: "--bg-dark",
  darker_background: "--bg-darker",
  lighter_background: "--bg-light",
  foreground: "--fg",
  bright_foreground: "--fg-bright",
  light_foreground: "--fg-mid",
  dark_foreground: "--fg-dim",
  muted: "--muted",
  accent: "--accent",
  selection: "--selection",
  red: "--red",
  green: "--green",
  yellow: "--yellow",
  orange: "--orange",
  blue: "--blue",
  cyan: "--cyan",
  magenta: "--magenta",
  brown: "--brown",
  bright_red: "--bright-red",
  bright_green: "--bright-green",
  bright_yellow: "--bright-yellow",
  bright_blue: "--bright-blue",
  bright_cyan: "--bright-cyan",
  bright_magenta: "--bright-magenta",
}

function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "")
  if (!m) return 0.5
  const n = parseInt(m[1], 16)
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

/** Apply a theme to the document. Returns the theme object. */
export function applyTheme(id, root = document.documentElement) {
  const theme = themeById(id)
  for (const [token, cssVar] of Object.entries(TOKEN_VARS)) {
    const value = theme.colors[token]
    if (value) root.style.setProperty(cssVar, value)
  }
  root.style.setProperty("--on-accent", luminance(theme.colors.accent) > 0.45 ? "#101014" : "#f4f4f8")
  root.dataset.theme = theme.id
  root.dataset.mode = theme.mode
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", theme.colors.dark_background || theme.colors.background)
  return theme
}

// ---- wallpaper ------------------------------------------------------------

const cache = new Map()

/** A dusk landscape drawn only from the theme's palette, as a data URI.
 *  Deterministic per theme, so it can be cached and precached. */
export function wallpaperFor(id) {
  if (cache.has(id)) return cache.get(id)
  const theme = themeById(id)
  const c = theme.colors
  const light = theme.mode === "light"
  const deep = light ? c.lighter_background || c.background : c.darker_background || c.background
  const horizon = 1128
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1560" width="720" height="1560">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${deep}"/>
      <stop offset="0.22" stop-color="${c.background}"/>
      <stop offset="0.48" stop-color="${c.blue || c.accent}" stop-opacity="${light ? 0.5 : 0.42}"/>
      <stop offset="0.66" stop-color="${c.magenta || c.accent}" stop-opacity="0.72"/>
      <stop offset="0.79" stop-color="${c.orange || c.red}" stop-opacity="0.92"/>
      <stop offset="0.86" stop-color="${c.yellow || c.orange}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${c.dark_background || c.background}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${c.bright_yellow || c.yellow}" stop-opacity="0.95"/>
      <stop offset="0.35" stop-color="${c.yellow || c.orange}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${c.orange || c.red}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ridge" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0" stop-color="${c.magenta || c.accent}" stop-opacity="0.55"/>
      <stop offset="0.55" stop-color="${c.blue || c.cyan}" stop-opacity="0.42"/>
      <stop offset="1" stop-color="${c.accent}" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="mid" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${deep}" stop-opacity="0.88"/>
      <stop offset="0.5" stop-color="${c.magenta || c.accent}" stop-opacity="0.34"/>
      <stop offset="1" stop-color="${deep}" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="near" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${deep}" stop-opacity="0.96"/>
      <stop offset="1" stop-color="${deep}"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0.55" stop-color="${deep}" stop-opacity="0"/>
      <stop offset="1" stop-color="${deep}" stop-opacity="${light ? 0.18 : 0.45}"/>
    </radialGradient>
  </defs>
  <rect width="720" height="1560" fill="url(#sky)"/>
  <circle cx="498" cy="${horizon - 26}" r="215" fill="url(#glow)"/>
  <circle cx="498" cy="${horizon - 26}" r="46" fill="${c.bright_yellow || c.yellow}" opacity="0.95"/>
  <g opacity="${light ? 0 : 0.75}" fill="${c.bright_foreground || c.foreground}">
    <circle cx="96" cy="196" r="1.7" opacity="0.65"/><circle cx="186" cy="104" r="1.2" opacity="0.45"/>
    <circle cx="312" cy="158" r="1.8" opacity="0.55"/><circle cx="446" cy="80" r="1.1" opacity="0.4"/>
    <circle cx="616" cy="140" r="1.5" opacity="0.5"/><circle cx="668" cy="262" r="1" opacity="0.35"/>
    <circle cx="238" cy="286" r="1" opacity="0.3"/><circle cx="528" cy="330" r="1.2" opacity="0.25"/>
  </g>
  <path d="M0 ${horizon - 96} C 120 ${horizon - 132} 216 ${horizon - 96} 330 ${horizon - 120} C 452 ${horizon - 146} 566 ${horizon - 108} 720 ${horizon - 132} L720 1560 L0 1560 Z" fill="url(#ridge)"/>
  <path d="M0 ${horizon + 58} C 130 ${horizon + 6} 244 ${horizon + 62} 372 ${horizon + 28} C 502 ${horizon - 6} 606 ${horizon + 44} 720 ${horizon + 12} L720 1560 L0 1560 Z" fill="url(#mid)"/>
  <path d="M0 ${horizon + 208} C 148 ${horizon + 146} 288 ${horizon + 214} 432 ${horizon + 168} C 556 ${horizon + 130} 640 ${horizon + 176} 720 ${horizon + 142} L720 1560 L0 1560 Z" fill="url(#near)"/>
  <path d="M286 1560 C 322 1442 258 1352 318 1272 C 366 1208 348 1158 336 ${horizon + 44} L 366 ${horizon + 40} C 380 1160 404 1216 360 1292 C 316 1374 390 1452 372 1560 Z" fill="${c.bright_foreground || c.foreground}" opacity="0.1"/>
  <rect width="720" height="1560" fill="url(#vignette)"/>
</svg>`
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  cache.set(id, uri)
  return uri
}

/** A theme's three signature colours, for the picker's swatch. */
export function swatchFor(id) {
  const c = themeById(id).colors
  return [c.background, c.accent, c.magenta || c.blue || c.foreground]
}
