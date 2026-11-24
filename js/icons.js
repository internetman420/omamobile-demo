// SPDX-License-Identifier: MIT
// Inline SVG icon set, drawn at 24×24 on the phone's stroke grid. Everything
// is hand-written geometry so the demo ships no icon font and no external
// sprite: icons take their colour from `currentColor`.

const STROKE = {
  wifi: '<path d="M2 8.8a15 15 0 0 1 20 0"/><path d="M5 12.9a10 10 0 0 1 14 0"/><path d="M8.5 16.9a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>',
  "wifi-off":
    '<path d="M2 8.8a15 15 0 0 1 6-3.6"/><path d="M14.5 5.3a15 15 0 0 1 7.5 3.5"/><path d="M5 12.9a10 10 0 0 1 4-2.4"/><path d="M14 10.6a10 10 0 0 1 5 2.3"/><path d="M8.5 16.9a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/><line x1="3" y1="3" x2="21" y2="21"/>',
  bluetooth: '<path d="M7 7.5 17 16.5 12 21V3l5 4.5L7 16.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="16.2" y1="16.2" x2="21" y2="21"/>',
  mic: '<path d="M12 2.5a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0v-6a3 3 0 0 0-3-3Z"/><path d="M18.5 10.5v1a6.5 6.5 0 0 1-13 0v-1"/><line x1="12" y1="18" x2="12" y2="21.5"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  "chevron-left": '<path d="M15 5 8 12l7 7"/>',
  "chevron-right": '<path d="M9 5l7 7-7 7"/>',
  "chevron-down": '<path d="M5 9l7 7 7-7"/>',
  "chevron-up": '<path d="M5 15l7-7 7 7"/>',
  "arrow-left": '<path d="M20 12H4"/><path d="M10 6 4 12l6 6"/>',
  "arrow-up-right": '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  phone:
    '<path d="M21 16.9v2.6a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.7 2 2 0 0 1 3.1 1.5h2.6a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L6.6 9.2a15.8 15.8 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z"/>',
  "phone-off":
    '<path d="M21 16.9v2.6a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.7 2 2 0 0 1 3.1 1.5h2.6a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L6.6 9.2a15.8 15.8 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z"/><line x1="3" y1="3" x2="21" y2="21"/>',
  "phone-in": '<path d="M21 16.9v2.6a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.7 2 2 0 0 1 3.1 1.5h2.6a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L6.6 9.2a15.8 15.8 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z"/><path d="M15 5l6 6"/><path d="M21 5v6h-6"/>',
  "phone-out": '<path d="M21 16.9v2.6a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.7 2 2 0 0 1 3.1 1.5h2.6a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L6.6 9.2a15.8 15.8 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z"/><path d="M15 11 21 5"/><path d="M21 11V5h-6"/>',
  message: '<path d="M21 14.5a2.5 2.5 0 0 1-2.5 2.5H7.5L3 21.5V4.5A2.5 2.5 0 0 1 5.5 2h13A2.5 2.5 0 0 1 21 4.5Z"/>',
  camera:
    '<path d="M14.7 4h-5.4L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z"/><circle cx="12" cy="13" r="3.6"/>',
  users:
    '<path d="M16 21v-1.8a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V21"/><circle cx="9.2" cy="7.5" r="3.8"/><path d="M21.5 21v-1.8a4 4 0 0 0-3-3.8"/><path d="M16 3.8a3.8 3.8 0 0 1 0 7.4"/>',
  sliders:
    '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1.5" y1="14" x2="6.5" y2="14"/><line x1="9.5" y1="8" x2="14.5" y2="8"/><line x1="17.5" y1="16" x2="22.5" y2="16"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  torch: '<path d="M8 2h8l1.5 5h-11Z"/><path d="M18.5 7v11.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V7"/><path d="M12 11v3.5"/><path d="M10.2 24v-2.2"/><path d="M13.8 24v-2.2"/>',
  moon: '<path d="M12 3.2A6.2 6.2 0 0 0 20.8 12 9.2 9.2 0 1 1 12 3.2Z"/>',
  rotate: '<path d="M20.5 12a8.5 8.5 0 1 1-2.9-6.4L21 8.5"/><path d="M21 3.5v5h-5"/>',
  plane: '<path d="M17.3 19.6 15.4 11l3.9-3.9c1.6-1.6 2.1-3.5 1.5-4.1-.6-.6-2.5-.1-4.1 1.5L12.8 8.4 4.2 6.5a.8.8 0 0 0-.8.3l-.4.6c-.2.4-.1.8.3 1.1l6 3.8-2.3 3.4H4.6L3.4 16.5l3.4 2.2 2.2 3.4 1.6-1.2v-2.4l3.4-2.3 3.8 6c.3.4.7.5 1.1.3l.6-.4a.8.8 0 0 0 .3-.8Z"/>',
  "map-pin": '<path d="M20 10.3c0 6-8 11.7-8 11.7s-8-5.7-8-11.7a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 1.8v2.4"/><path d="M12 19.8v2.4"/><path d="M4.8 4.8l1.7 1.7"/><path d="M17.5 17.5l1.7 1.7"/><path d="M1.8 12h2.4"/><path d="M19.8 12h2.4"/><path d="M4.8 19.2l1.7-1.7"/><path d="M17.5 6.5l1.7-1.7"/>',
  "cloud-sun": '<path d="M11 3.1a3.6 3.6 0 0 0-3.5 4.4 5.4 5.4 0 0 0-2 10.4h.4"/><path d="M9.5 3.6 9 1.9"/><path d="M6 5.4 4.8 4.2"/><path d="M5.2 8.9H3.4"/><path d="M17 20.3H7.8a3.9 3.9 0 0 1-.7-7.7 5.3 5.3 0 0 1 10.2-.6 4.2 4.2 0 0 1-.3 8.3Z"/>',
  cloud: '<path d="M17.4 20H6.9a4.4 4.4 0 0 1-.7-8.7 6 6 0 0 1 11.5-.7 4.7 4.7 0 0 1-.3 9.4Z"/>',
  "cloud-rain": '<path d="M17.4 15.5H6.9a4.4 4.4 0 0 1-.7-8.7 6 6 0 0 1 11.5-.7 4.7 4.7 0 0 1-.3 9.4Z"/><path d="M8.5 18.5v2.4"/><path d="M12 18.8v2.7"/><path d="M15.5 18.5v2.4"/>',
  x: '<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>',
  plus: '<line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/>',
  check: '<path d="M20 6 9.4 17 4 11.7"/>',
  lock: '<rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  unlock: '<rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 7.5-2"/>',
  fingerprint:
    '<path d="M4.5 10a7.5 7.5 0 0 1 15 0"/><path d="M7 11.5a5 5 0 0 1 10 0v3"/><path d="M9.6 12.2a2.4 2.4 0 0 1 4.8 0v6"/><path d="M4.8 15.5c0 2.2-.4 3.6-1 5"/><path d="M19.2 15.5c0 2.2.4 3.6 1 5"/><path d="M7.2 16c0 2-.6 3.6-1.4 5.2"/>',
  delete: '<path d="M9 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9L2 12Z"/><path d="m12.5 9 6 6"/><path d="m18.5 9-6 6"/>',
  star: '<path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9Z"/>',
  play: '<path d="M6.5 3.5 20 12 6.5 20.5Z" fill="currentColor"/>',
  pause: '<rect x="6" y="3.5" width="4" height="17" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="3.5" width="4" height="17" rx="1" fill="currentColor" stroke="none"/>',
  "skip-back": '<path d="M19 4.5 8 12l11 7.5Z" fill="currentColor"/><line x1="4.5" y1="4.5" x2="4.5" y2="19.5"/>',
  "skip-forward": '<path d="M5 4.5 16 12 5 19.5Z" fill="currentColor"/><line x1="19.5" y1="4.5" x2="19.5" y2="19.5"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/>',
  notes: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z"/><path d="M14 2.5V8h5.5"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
  terminal: '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="m6.5 9 3 3-3 3"/><line x1="12.5" y1="15.5" x2="17" y2="15.5"/>',
  folder: '<path d="M3 7.5a2 2 0 0 1 2-2h4l2.2 3H19a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3.2 9.5h17.6"/><path d="M3.2 14.5h17.6"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/>',
  volume: '<path d="M11.5 4.5 6.5 8.5H3v7h3.5l5 4Z"/><path d="M15.5 8.7a4.6 4.6 0 0 1 0 6.6"/><path d="M18.5 6a8.5 8.5 0 0 1 0 12"/>',
  "volume-x": '<path d="M11.5 4.5 6.5 8.5H3v7h3.5l5 4Z"/><line x1="16" y1="9" x2="21" y2="15"/><line x1="21" y1="9" x2="16" y2="15"/>',
  brightness: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5"/><path d="M12 19.5V22"/><path d="M2 12h2.5"/><path d="M19.5 12H22"/><path d="M4.9 4.9 6.7 6.7"/><path d="M17.3 17.3l1.8 1.8"/><path d="M4.9 19.1 6.7 17.3"/><path d="M17.3 6.7l1.8-1.8"/>',
  signal: '<line x1="4" y1="20" x2="4" y2="15"/><line x1="9.3" y1="20" x2="9.3" y2="11"/><line x1="14.7" y1="20" x2="14.7" y2="7"/><line x1="20" y1="20" x2="20" y2="3"/>',
  ellipsis: '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
  bell: '<path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-2.5 8-2.5 8h17S18 15 18 8.5"/><path d="M13.7 20.5a2 2 0 0 1-3.4 0"/>',
  music: '<circle cx="7" cy="18" r="3"/><circle cx="18.5" cy="15.5" r="3"/><path d="M10 18V5l11.5-2.5v13"/>',
  pencil: '<path d="M4 20h4L20.5 7.5a2.1 2.1 0 0 0-3-3L5 17Z"/><path d="M15.5 6.5 18.5 9.5"/>',
  trash: '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6 7l1 13.5h10L18 7"/>',
  info: '<circle cx="12" cy="12" r="9.2"/><line x1="12" y1="11" x2="12" y2="17"/><circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M3.5 12a8.5 8.5 0 0 1 14.4-6.1L21 8.5"/><path d="M21 3.5v5h-5"/><path d="M20.5 12a8.5 8.5 0 0 1-14.4 6.1L3 15.5"/><path d="M3 20.5v-5h5"/>',
  clock: '<circle cx="12" cy="12" r="9.2"/><path d="M12 6.5V12l4 2.5"/>',
  keyboard: '<rect x="2" y="5.5" width="20" height="13" rx="2.5"/><line x1="6" y1="9.5" x2="6" y2="9.6"/><line x1="9.5" y1="9.5" x2="9.5" y2="9.6"/><line x1="13" y1="9.5" x2="13" y2="9.6"/><line x1="16.5" y1="9.5" x2="16.5" y2="9.6"/><line x1="7.5" y1="14.5" x2="16.5" y2="14.5"/>',
  cloud: '<path d="M17.4 20H6.9a4.4 4.4 0 0 1-.7-8.7 6 6 0 0 1 11.5-.7 4.7 4.7 0 0 1-.3 9.4Z"/>',
  wifiqr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  bluetooth2: '<path d="M7 7.5 17 16.5 12 21V3l5 4.5L7 16.5"/>',
}

const FILL = {
  play_filled: "",
}

/** Icon names the demo offers. */
export const ICON_NAMES = Object.keys(STROKE).sort()

/** An <svg> string for use with `html:` or `innerHTML`. */
export function icon(name, { size = 24, stroke = 1.9, cls = "", style = "" } = {}) {
  const body = STROKE[name]
  if (!body) {
    if (import.meta?.env?.DEV) console.warn(`icon: unknown "${name}"`)
    return ""
  }
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${style ? ` style="${style}"` : ""}>${body}</svg>`
}

/** An <svg> element, for h(). */
export function iconEl(name, opts) {
  const wrap = document.createElement("span")
  wrap.className = "icon-wrap"
  wrap.innerHTML = icon(name, opts)
  return wrap.firstElementChild || wrap
}

/** The Arch Linux mark, filled, for the system widget and the install icon. */
export function archLogo({ size = 40, cls = "" } = {}) {
  return `<svg class="icon arch-logo ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 1.5 1.2 22.5h4.2L12 9.2l6.6 13.3h4.2Zm0 12.4-2.2 4.4c1.5-.9 3-.9 4.4 0Z"/></svg>`
}
