// SPDX-License-Identifier: MIT
// The status bar: the clock on the left, the radios and the battery on the
// right, exactly where the phone puts them.

import { h, fill, statusTime } from "./util.js"
import { icon } from "./icons.js"
import { isOn } from "./store.js"
import { battery } from "./ui.js"

export function renderStatusBar(el, state) {
  const hidden = state.shade || !state.unlocked
  fill(
    el,
    h(
      "div",
      { class: `statusbar${hidden ? " is-hidden" : ""}`, id: "statusbar" },
      h("span", { class: "statusbar__time", "data-clock": "status" }, statusTime(new Date(state.clock))),
      h(
        "div",
        { class: "statusbar__icons" },
        isOn("wifi") ? h("span", { html: icon("wifi", { size: 25, stroke: 1.9 }) }) : h("span", { html: icon("wifi-off", { size: 25, stroke: 1.9 }) }),
        isOn("bluetooth") ? h("span", { html: icon("bluetooth", { size: 23, stroke: 1.9 }) }) : null,
        isOn("dnd") ? h("span", { html: icon("moon", { size: 22, stroke: 1.8 }) }) : null,
        battery(state.battery, { showPercent: true }),
      ),
    ),
  )
}
