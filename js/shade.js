// SPDX-License-Identifier: MIT
// The shade: notifications on top, then quick settings with their two pages
// of tiles and the brightness and volume sliders. Pulled down from the status
// bar or the home screen, dismissed by tapping the wallpaper or swiping up.

import { h, fill, time12, longDate, clamp } from "./util.js"
import { icon } from "./icons.js"
import { store, toggleTile, openNotification, dismissNotification, clearNotifications } from "./store.js"
import { attachDrag } from "./gestures.js"
import { battery, notificationCard } from "./ui.js"

function slider({ label, value, onCommit, iconName }) {
  const track = h(
    "div",
    { class: "slider__track", role: "slider", tabindex: "0", "aria-label": label, "aria-valuenow": String(value), "aria-valuemin": "0", "aria-valuemax": "100" },
    h("div", { class: "slider__fill", style: { width: `${value}%` } }),
    h("div", { class: "slider__knob", style: { left: `${value}%` } }),
  )
  const valueEl = h("div", { class: "slider__value" }, `${Math.round(value)}`)
  let current = value

  // The drag moves the thumb; only the release writes to the store. Writing
  // on every move would redraw (and therefore replace) the track under the
  // finger, which is both janky and wrong.
  const apply = (clientX) => {
    const rect = track.getBoundingClientRect()
    if (!rect.width) return
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    current = Math.round(ratio * 100)
    track.querySelector(".slider__fill").style.width = `${current}%`
    track.querySelector(".slider__knob").style.left = `${current}%`
    track.setAttribute("aria-valuenow", String(current))
    valueEl.textContent = String(current)
  }

  attachDrag(track, {
    axis: "x",
    onStart: ({ event }) => apply(event.clientX),
    onMove: ({ event }) => apply(event.clientX),
    onEnd: () => onCommit(current),
  })
  track.addEventListener("keydown", (event) => {
    const step = event.key === "ArrowRight" ? 5 : event.key === "ArrowLeft" ? -5 : 0
    if (!step) return
    event.preventDefault()
    current = clamp(current + step, 0, 100)
    onCommit(current)
  })

  return h(
    "div",
    { class: "slider" },
    h("span", { html: icon(iconName, { size: 28 }) }),
    track,
    valueEl,
  )
}

function tileButton(t, state) {
  return h(
    "button",
    {
      type: "button",
      class: `tile${t.on ? " is-on" : ""}`,
      disabled: t.disabled,
      "aria-pressed": String(!!t.on),
      onclick: () => toggleTile(t.id),
    },
    h("span", { html: icon(t.icon, { size: 38, stroke: 1.7 }) }),
    h("span", { class: "tile__text" }, h("span", { class: "tile__label" }, t.label), h("span", { class: "tile__detail" }, t.detail)),
  )
}

export function renderShade(el, state, { setShade }) {
  const page = state.shadePage
  const tiles = state.tiles.slice(page * 8, page * 8 + 8)
  const shown = state.notifications.slice(0, 4)

  fill(
    el,
    h(
      "div",
      { class: `shade${state.shade ? " is-open" : ""}`, id: "shade" },
      h("button", { type: "button", class: "shade__scrim-btn", "aria-label": "Close quick settings", onclick: () => setShade(false), style: { position: "absolute", inset: "0", background: "none" } }),
      h(
        "div",
        { class: "shade__panel", id: "shade-panel" },
        h(
          "div",
          { class: "shade__header" },
          h("div", { class: "shade__clock" }, time12(new Date(state.clock))),
          h("div", { class: "shade__date" }, longDate(new Date(state.clock))),
          h("div", { class: "shade__battery" }, battery(state.battery, { showPercent: true })),
        ),
        state.notifications.length
          ? h(
              "div",
              { class: "shade__notifications" },
              shown.map((n) => notificationCard(n, { onOpen: openNotification, onDismiss: dismissNotification })),
              h("button", { type: "button", class: "shade__clear", onclick: clearNotifications }, state.notifications.length > shown.length ? `Clear all ${state.notifications.length}` : "Clear all"),
            )
          : h("div", { class: "app__empty", style: { padding: "10px 4px 16px", textAlign: "left", fontSize: "20px" } }, "No notifications."),
        h("div", { class: "tiles" }, tiles.map((t) => tileButton(t, state))),
        h(
          "div",
          { class: "tiles__footer" },
          h(
            "div",
            { class: "tiles__dots", role: "tablist", "aria-label": "Quick settings pages" },
            [0, 1].map((i) =>
              h("button", {
                type: "button",
                class: i === page ? "is-active" : "",
                "aria-label": `Quick settings page ${i + 1}`,
                onclick: () => store.set({ shadePage: i }),
              }),
            ),
          ),
          h(
            "button",
            {
              type: "button",
              class: "tiles__edit",
              "aria-label": "Edit tiles and theme",
              onclick: () => store.set({ sheet: { kind: "theme" }, shade: false }),
            },
            h("span", { html: icon("pencil", { size: 24 }) }),
          ),
        ),
        h(
          "div",
          { class: "sliders", id: "sliders" },
          slider({ label: "Brightness", value: state.brightness, iconName: "brightness", onCommit: (v) => store.set({ brightness: v }) }),
          slider({ label: "Volume", value: state.volume, iconName: "volume", onCommit: (v) => store.set({ volume: v }) }),
        ),
        h("div", { class: "shade__handle", id: "shade-handle" }, h("span")),
      ),
    ),
  )
}
