// SPDX-License-Identifier: MIT
// Heads-up notifications: the cards that drop in under the status bar, and
// the tap that takes you to the thing that sent them.

import { h, fill } from "./util.js"
import { icon } from "./icons.js"
import { openNotification, dismissToast } from "./store.js"

export function renderToasts(el, state) {
  fill(
    el,
    h(
      "div",
      { class: "toasts", "aria-live": "polite" },
      state.toasts.map((n) =>
        h(
          "div",
          {
            class: "toast",
            role: "button",
            tabindex: "0",
            onclick: () => openNotification(n),
            onkeydown: (event) => {
              if (event.key === "Enter") openNotification(n)
            },
          },
          h("div", { class: "notification__icon", html: icon(n.icon || "bell", { size: 22 }) }),
          h(
            "div",
            { class: "notification__body" },
            h("div", { class: "notification__app" }, n.app),
            h("div", { class: "notification__title" }, n.title),
            n.body ? h("div", { class: "notification__text" }, n.body) : null,
          ),
          h(
            "button",
            {
              type: "button",
              class: "notification__dismiss",
              "aria-label": "Dismiss notification",
              onclick: (event) => {
                event.stopPropagation()
                dismissToast(n.id)
              },
            },
            h("span", { html: icon("x", { size: 20 }) }),
          ),
        ),
      ),
    ),
  )
}
