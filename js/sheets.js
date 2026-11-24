// SPDX-License-Identifier: MIT
// Bottom sheets: the theme picker, About, the Omarchy update, and the card a
// desktop app's tile explains itself with.

import { h, fill, formatPhone } from "./util.js"
import { icon, archLogo } from "./icons.js"
import { avatar } from "./ui.js"
import { store, setTheme, toggleWallpaper, openThread, demo } from "./store.js"
import { THEMES, themeById, swatchFor } from "./theme.js"

let entering = false

function shell({ title, lead, body, actions, onClose, label = "Sheet" }) {
  return h(
    "div",
    { class: `sheet-backdrop${entering ? " sheet-backdrop--enter" : ""}`, id: "sheet-backdrop", onclick: (event) => event.target === event.currentTarget && onClose(), role: "dialog", "aria-label": label },
    h(
      "div",
      { class: "sheet", role: "document" },
      h("div", { class: "sheet__handle", "aria-hidden": "true" }),
      title ? h("div", { class: "sheet__title" }, title) : null,
      lead ? h("div", { class: "sheet__lead" }, lead) : null,
      body,
      actions ? h("div", { class: "sheet__actions" }, actions) : null,
    ),
  )
}

function themeSheet(state, close) {
  const active = themeById(state.theme)
  return shell({
    label: "Themes",
    title: "Themes",
    lead: `Omarchy's theme tokens, live. ${THEMES.length} of them ship with this demo; the phone picks one and everything follows — shell, apps and wallpaper.`,
    body: h(
      "div",
      { class: "theme-grid scroll", style: { maxHeight: "60vh" } },
      THEMES.map((theme) => {
        const [bg, accent, extra] = swatchFor(theme.id)
        return h(
          "button",
          {
            type: "button",
            class: `theme-card${theme.id === state.theme ? " is-active" : ""}`,
            onclick: () => setTheme(theme.id),
            "aria-pressed": String(theme.id === state.theme),
          },
          h("span", { class: "swatch", "aria-hidden": "true" }, [bg, accent, extra].map((c) => h("span", { style: { background: c } }))),
          h("span", null, h("span", { class: "theme-card__name" }, theme.name), h("br"), h("span", { class: "theme-card__mode" }, theme.mode)),
        )
      }),
    ),
    actions: [
      h(
        "button",
        { type: "button", class: "btn", onclick: toggleWallpaper },
        h("span", { html: icon(state.wallpaper ? "check" : "x", { size: 22 }) }),
        state.wallpaper ? "Wallpaper on" : "Wallpaper off",
      ),
      h("button", { type: "button", class: "btn btn--primary", onclick: close }, "Done"),
    ],
    onClose: close,
  })
}

function aboutSheet(state, close) {
  const d = demo.DEVICE
  return shell({
    label: "About this demo",
    title: "Omamobile, in a browser",
    lead: "A live recreation of the phone profile Omamobile runs on a Pixel 7 Pro — the shell, the apps and the theme system of Omarchy 4.5 on Arch Linux ARM.",
    body: h(
      "div",
      { class: "about scroll", style: { maxHeight: "48vh", padding: "0" } },
      h(
        "div",
        { class: "device-line" },
        h("span", { html: archLogo({ size: 30 }), style: { color: "var(--accent)" } }),
        `${d.name} · ${d.codename} · ${d.soc}`,
      ),
      h("h3", null, "What this is"),
      h(
        "p",
        null,
        "Omamobile runs native Omarchy on phones: Arch Linux ARM, Hyprland and Omarchy's own apps, on a mainline kernel with no Android underneath. Its phone UI is not a fork of Omarchy — it is a set of ordinary Omarchy shell plugins plus a phone shell.json. This demo rebuilds those plugins for the browser so you can try the shell before flashing a phone.",
      ),
      h("h3", null, "Simulated"),
      h(
        "ul",
        { class: "facts" },
        [
          ["tick", "The shell: status bar, home screens and widgets, quick settings, app drawer, recents, the home pill, the lock screen and its PIN pad."],
          ["tick", "Messages, Phone, Contacts, Calendar, Weather and Notes, on the project's own fictional demo data: ten made-up people, texts, calls and five notifications."],
          ["tick", "Themes: every colour is read from Omarchy's colors.toml."],
          ["cross", "The modem: no calls, texts or mobile data leave this page. Sending a text is delivered by a timer."],
          ["cross", "Camera, sensors, fingerprint reader, voice typing and Waydroid."],
        ].map(([kind, text]) =>
          h("li", null, h("span", { class: kind, html: icon(kind === "tick" ? "check" : "x", { size: 20 }) }), text),
        ),
      ),
      h("h3", null, "Try"),
      h(
        "ul",
        { class: "facts" },
        [
          ["tick", "Swipe down on the home screen for notifications and quick settings."],
          ["tick", "Swipe up on the dock for every app; swipe up on the pill in an app for recents."],
          ["tick", "Swipe from a screen edge to go back, and tap the pill to go home."],
          ["tick", "Open Messages and send something; open Appearance for themes."],
        ].map(([kind, text]) => h("li", null, h("span", { class: kind, html: icon("check", { size: 20 }) }), text)),
      ),
      h("h3", null, "Where this comes from"),
      h(
        "p",
        { html: `Based on <a href="https://github.com/derekross/omamobile" target="_blank" rel="noreferrer">Omamobile</a> (MIT) and <a href="https://github.com/basecamp/omarchy" target="_blank" rel="noreferrer">Omarchy</a> (MIT). It is an independent, unofficial demo — not an Omarchy or Basecamp product, and not part of the Omamobile project. Theme colours come from the Omarchy installation this was built against.` },
      ),
      h("p", { class: "fine" }, `Theme: ${themeById(state.theme).name}. Screen: ${d.width}×${d.height} logical pixels, half the Pixel 7 Pro's panel.`),
    ),
    actions: [
      h(
        "button",
        { type: "button", class: "btn btn--primary btn--wide", onclick: () => window.omaInstall?.() },
        h("span", { html: icon("plus", { size: 22 }) }),
        "Install on this device",
      ),
      h("button", { type: "button", class: "btn", onclick: () => store.set({ sheet: { kind: "theme" } }) }, "Themes"),
      h(
        "button",
        {
          type: "button",
          class: "btn btn--danger",
          onclick: () => {
            store.reset()
            close()
          },
        },
        "Reset demo",
      ),
    ],
    onClose: close,
  })
}

function updateSheet(close) {
  return shell({
    label: "Omarchy update",
    title: "Omarchy 4.5.0-3 is available",
    lead: "268 packages to update, 1.2 GiB to download. The phone updates through omamobile-update, which keeps the shell patches in place.",
    body: h(
      "div",
      { class: "about", style: { padding: "0" } },
      h("ul", { class: "facts" }, [
        ["tick", "omarchy-shell 4.5.0-3"],
        ["tick", "hyprland 0.5x — patched for touch"],
        ["tick", "omamobile-shell, omamobile-apps, omatel, omaphone"],
        ["tick", "265 more"],
      ].map(([kind, text]) => h("li", null, h("span", { class: kind, html: icon("check", { size: 20 }) }), text))),
      h("p", { style: { marginTop: "16px", fontSize: "19px", color: "var(--fg-dim)" } }, "Updating is not simulated: this is a demo, and you have no packages."),
    ),
    actions: [
      h("button", { type: "button", class: "btn btn--primary", onclick: close }, "Later"),
      h("button", { type: "button", class: "btn", disabled: true, style: { opacity: "0.5" } }, "Update"),
    ],
    onClose: close,
  })
}

function desktopAppSheet(app, close) {
  return shell({
    label: `${app.name} is a desktop app`,
    title: app.name,
    lead: `${app.name} is a real Omarchy desktop app, not one of the phone's own. On the phone it runs full screen like this one would; the demo simulates the shell, Messages, Phone, Contacts, Camera, Calendar, Weather, Notes and the terminal.`,
    body: h(
      "div",
      { class: "placeholder", style: { padding: "10px 0 20px" } },
      h("div", { class: "app-icon", html: icon(app.icon, { size: 52, stroke: 1.6 }) }),
    ),
    actions: [h("button", { type: "button", class: "btn btn--primary btn--wide", onclick: close }, "Got it")],
    onClose: close,
  })
}

function callSheet(sheet, close) {
  return shell({
    label: `Call ${sheet.name}`,
    title: sheet.name || sheet.number,
    lead: `${formatPhone(sheet.number)} · calling…`,
    body: h(
      "div",
      { class: "placeholder", style: { padding: "6px 0 18px", gap: "14px" } },
      h("div", { class: "calling-dots", "aria-hidden": "true" }, [0, 1, 2].map((i) => h("span", { style: { animationDelay: `${i * 160}ms` } }))),
      h("p", null, "There is no modem in this demo, so nothing rings and nothing is sent. On the phone, calls go through omatel and the modem's own vendor chroot."),
    ),
    actions: [
      h("button", { type: "button", class: "btn btn--danger btn--wide", onclick: close }, "End call"),
    ],
    onClose: close,
  })
}

function contactSheet(sheet, close) {
  const c = sheet.contact
  return shell({
    label: c.name,
    title: c.name,
    lead: `${formatPhone(c.number)} · ${c.email}`,
    body: h(
      "div",
      { class: "placeholder", style: { padding: "6px 0 14px" } },
      avatar(c, { large: true }),
      c.note ? h("p", null, c.note) : null,
    ),
    actions: [
      h("button", { type: "button", class: "btn", onclick: () => store.set({ sheet: { kind: "call", number: c.number, name: c.name } }) }, "Call"),
      h("button", { type: "button", class: "btn btn--primary", onclick: () => openThread(c.id) }, "Message"),
    ],
    onClose: close,
  })
}

function installSheet(sheet, close) {
  const installed = !!sheet.installed
  return shell({
    label: "Install",
    title: installed ? "Already installed" : "Install this demo",
    lead: installed
      ? "You are running it as an app. It works offline: the shell, the themes and the demo data are all cached."
      : "This page is a PWA. Installed, it opens full screen with no browser chrome, keeps working without a network, and gets its own icon.",
    body: h(
      "div",
      { class: "about", style: { padding: "0" } },
      h("h3", null, "Chrome, Edge, Brave, Samsung Internet"),
      h("p", null, "Open the browser menu and choose Install app (or Add to Home screen). If the menu offers it, you can also use the Install button in this sheet."),
      h("h3", null, "Firefox on Android"),
      h("p", null, "Menu → Add to Home screen. It runs as a shortcut rather than a full-screen app."),
      h("h3", null, "iPhone and iPad"),
      h("p", null, "Share → Add to Home Screen. It opens full screen; the demo is tested on Chromium and handheld sizes."),
      h("h3", null, "Serving it yourself"),
      h("p", null, "The demo is static files. Any HTTPS host does; service workers need a secure origin, which localhost counts as."),
    ),
    actions: [h("button", { type: "button", class: "btn btn--primary btn--wide", onclick: close }, "Got it")],
    onClose: close,
  })
}

export function renderSheets(el, state, { enter = false } = {}) {
  const sheet = state.sheet
  entering = enter
  if (!sheet) {
    fill(el)
    return
  }
  const close = () => store.set({ sheet: null })
  let content = null
  if (sheet.kind === "theme") content = themeSheet(state, close)
  else if (sheet.kind === "about") content = aboutSheet(state, close)
  else if (sheet.kind === "update") content = updateSheet(close)
  else if (sheet.kind === "desktop-app") content = desktopAppSheet(sheet.app, close)
  else if (sheet.kind === "call") content = callSheet(sheet, close)
  else if (sheet.kind === "contact") content = contactSheet(sheet, close)
  else if (sheet.kind === "install") content = installSheet(sheet, close)
  fill(el, content)
}
