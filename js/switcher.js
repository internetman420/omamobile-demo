// SPDX-License-Identifier: MIT
// Recent apps: the cards you get by swiping up on the home pill (or up and
// holding on it). One card per app opened this session.

import { h, fill } from "./util.js"
import { store, openApp, demo } from "./store.js"
import { appIcon } from "./ui.js"

export function renderSwitcher(el, state) {
  if (!state.switcher) {
    fill(el)
    return
  }
  const apps = state.recent.map((id) => demo.apps().find((a) => a.id === id)).filter(Boolean)
  fill(
    el,
    h(
      "div",
      { class: "switcher", id: "switcher", role: "dialog", "aria-label": "Recent apps" },
      apps.length
        ? h(
            "div",
            { class: "switcher__rail scroll", id: "switcher-rail" },
            apps.map((app) =>
              h(
                "button",
                { type: "button", class: "switcher__card", onclick: () => openApp(app.id) },
                appIcon(app),
                h("span", { class: "switcher__name" }, app.name),
              ),
            ),
          )
        : h("div", { class: "switcher__empty" }, "No recent apps yet. Open one from the dock and it lands here."),
      h("div", { class: "switcher__hint" }, "Swipe down to go home"),
    ),
  )
}
