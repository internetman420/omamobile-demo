// SPDX-License-Identifier: MIT
// The home pill: the 44 px strip Omamobile reserves at the bottom of an app,
// with the pill itself in the middle. Tap for home, swipe up for recents.

import { h, fill } from "./util.js"

export function renderPill(el, state) {
  if (!state.app) {
    fill(el)
    return
  }
  fill(
    el,
    h(
      "div",
      { class: "pillstrip is-over-app", id: "pill-strip", role: "button", tabindex: "0", "aria-label": "Home" },
      h("div", { class: "pill" }),
    ),
  )
}
