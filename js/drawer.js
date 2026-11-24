// SPDX-License-Identifier: MIT
// The app drawer: search, then every app in a four-column grid. Typing
// filters as you go; Enter opens the first match.

import { h, fill } from "./util.js"
import { icon } from "./icons.js"
import { store, openApp, unreadCount, missedCalls, demo } from "./store.js"
import { appIcon } from "./ui.js"

let query = ""

export function setDrawerQuery(value) {
  query = value
}

const matches = (app, q) => !q || app.name.toLowerCase().includes(q.toLowerCase())
const filteredFor = (q) => demo.apps().filter((a) => matches(a, q))

function badges() {
  return { messages: unreadCount(), phone: missedCalls().length }
}

function gridContents(apps) {
  if (!apps.length) {
    return [h("div", { class: "drawer__empty" }, "Nothing matches. Try “messages”, “phone” or “theme”.")]
  }
  const counts = badges()
  return apps.map((app) =>
    h(
      "button",
      { type: "button", class: "drawer__app", onclick: () => openApp(app.id) },
      appIcon(app, { badge: counts[app.id] || 0 }),
      h("span", null, app.name),
    ),
  )
}

export function renderDrawer(el, state, { focus = false } = {}) {
  if (!state.drawer) {
    query = ""
    fill(el)
    return
  }
  const search = h("input", {
    type: "search",
    placeholder: "Search apps or ask Claude Code…",
    value: query,
    "aria-label": "Search apps",
    autocomplete: "off",
    spellcheck: "false",
    oninput: (event) => {
      query = event.target.value
      const grid = document.getElementById("drawer-grid")
      if (grid) fill(grid, gridContents(filteredFor(query)))
    },
    onkeydown: (event) => {
      if (event.key === "Enter") {
        const first = filteredFor(query)[0]
        if (first) openApp(first.id)
      }
      if (event.key === "Escape") {
        event.stopPropagation()
        query = ""
        store.set({ drawer: false })
      }
    },
  })

  fill(
    el,
    h(
      "div",
      { class: "drawer is-open", id: "drawer", role: "dialog", "aria-label": "All apps" },
      h(
        "div",
        { class: "drawer__search" },
        h("span", { html: icon("search", { size: 26 }) }),
        search,
        h("span", { html: icon("mic", { size: 24, stroke: 1.7 }) }),
      ),
      h("div", { class: "drawer__grid scroll", id: "drawer-grid" }, gridContents(filteredFor(query))),
    ),
  )

  if (focus) requestAnimationFrame(() => search.focus({ preventScroll: true }))
}
