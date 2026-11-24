// SPDX-License-Identifier: MIT
// Pieces several screens share: avatars, app tiles, notification cards,
// battery, and the icon-button used by every app header.

import { h, initials, hashHue, relativeDay, formatPhone, escapeHtml } from "./util.js"
import { icon, archLogo } from "./icons.js"

const AVATAR_INKS = ["--accent", "--magenta", "--green", "--yellow", "--cyan", "--blue", "--orange"]

export function avatar(contact, { large = false, name } = {}) {
  const label = name || contact?.name || contact?.address || "?"
  const ink = AVATAR_INKS[hashHue(label) % AVATAR_INKS.length]
  const isNumber = /^\+?[\d\s()-]+$/.test(label)
  return h(
    "div",
    {
      class: `avatar${large ? " avatar--lg" : ""}`,
      style: { background: `var(${ink})` },
      "aria-hidden": "true",
    },
    isNumber ? h("span", { html: icon("phone", { size: large ? 44 : 30, stroke: 1.8 }) }) : initials(label),
  )
}

export function appIcon(app, { accent = true, badge = 0 } = {}) {
  const tone = accent ? ` app-icon--${["accent", "magenta", "green", "yellow"][(app.name || "").length % 4]}` : ""
  return h(
    "div",
    { class: `app-icon${tone}` },
    h("span", { html: icon(app.icon || "grid", { size: 46, stroke: 1.7 }) }),
    badge > 0 ? h("span", { class: "badge" }, badge > 9 ? "9+" : badge) : null,
  )
}

export function iconButton(name, label, onClick, { size = 26, stroke = 1.9 } = {}) {
  return h(
    "button",
    { class: "iconbtn", type: "button", "aria-label": label, title: label, onclick: onClick },
    h("span", { html: icon(name, { size, stroke }) }),
  )
}

export function notificationCard(n, { onOpen, onDismiss, dismissible = true } = {}) {
  return h(
    "div",
    {
      class: `notification${n.read ? "" : " is-unread"}`,
      role: "button",
      tabindex: "0",
      onclick: () => onOpen?.(n),
      onkeydown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpen?.(n)
        }
      },
    },
    h("div", { class: "notification__icon", html: icon(n.icon || "bell", { size: 22 }) }),
    h(
      "div",
      { class: "notification__body" },
      h("div", { class: "notification__app" }, `${n.app} · ${relativeDay(n.at)}`),
      h("div", { class: "notification__title" }, n.title),
      n.body ? h("div", { class: "notification__text" }, n.body) : null,
    ),
    dismissible
      ? h(
          "button",
          {
            class: "notification__dismiss",
            type: "button",
            "aria-label": `Dismiss ${n.title}`,
            onclick: (event) => {
              event.stopPropagation()
              onDismiss?.(n)
            },
          },
          h("span", { html: icon("x", { size: 20 }) }),
        )
      : null,
  )
}

export function battery({ level = 97, charging = false } = {}, { showPercent = true } = {}) {
  return h(
    "div",
    { class: "statusbar__battery", title: `${level}%${charging ? ", charging" : ""}` },
    showPercent ? h("span", null, `${level}%`) : null,
    h(
      "div",
      { class: "battery", role: "img", "aria-label": `Battery ${level}%${charging ? ", charging" : ""}` },
      h("div", { class: "battery__fill", style: { transform: `scaleX(${Math.max(0.04, level / 100)})` } }),
      charging ? h("span", { class: "battery__bolt", "aria-hidden": "true" }, "⚡") : null,
    ),
  )
}

export function systemRow(label, value) {
  return [h("dt", null, label), h("dd", { html: value })]
}

export function archMark(size = 34) {
  const span = h("span")
  span.innerHTML = archLogo({ size })
  return span.firstElementChild
}

export function phoneNumber(number) {
  return h("span", { class: "mono" }, formatPhone(number))
}

export function html(markup) {
  return h("span", { html: markup })
}

export { escapeHtml }
