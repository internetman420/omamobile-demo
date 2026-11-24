// SPDX-License-Identifier: MIT
// The lock screen: glance, notification stack, and the PIN pad with its
// fingerprint shortcut. Any four digits unlock — nothing here is protecting
// anything, and the sheet says so.

import { h, fill, time12, longDate, vibrate, announce } from "./util.js"
import { icon } from "./icons.js"
import { store, unlock, openNotification, dismissNotification, demo } from "./store.js"
import { notificationCard } from "./ui.js"

// A tap that raises the pad must not also land on the pad underneath it: the
// keypad appears where the finger already is, exactly as on the phone. The
// test is precise — a key ignores clicks whose press began before the pad
// opened — so a fast typist never loses a digit.
let openedAt = 0
let lastDownAt = 0

export function openPin() {
  openedAt = performance.now()
  store.set({ pinOpen: true, pinBuffer: "" })
}

const fromOpeningGesture = () => lastDownAt < openedAt

const KEYS = [
  { digit: "1" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { fingerprint: true },
  { digit: "0" },
  { backspace: true },
]

function press(digit, fromPointer = false) {
  if (fromPointer && fromOpeningGesture()) return
  const state = store.get()
  const buffer = (state.pinBuffer + digit).slice(0, 4)
  vibrate(6)
  if (buffer.length === 4) {
    store.set({ pinBuffer: buffer })
    setTimeout(() => {
      vibrate([10, 40, 14])
      unlock()
      announce("Unlocked")
    }, 180)
  } else {
    store.set({ pinBuffer: buffer })
  }
}

function backspace(fromPointer = false) {
  if (fromPointer && fromOpeningGesture()) return
  const { pinBuffer } = store.get()
  store.set({ pinBuffer: pinBuffer.slice(0, -1) })
  vibrate(4)
}

export function pressDigit(digit) {
  if (store.get().pinOpen) press(digit)
}

export function pressBackspace() {
  if (store.get().pinOpen) backspace()
}

function pinPad(state) {
  return h(
    "div",
    {
      class: "pin",
      id: "pin-pad",
      onpointerdown: () => {
        lastDownAt = performance.now()
      },
    },
    h(
      "div",
      { class: "pin__top" },
      h("div", { class: "pin__lock", html: icon("lock", { size: 34 }) }),
      h("div", { class: "pin__title" }, "Enter PIN"),
      h("div", { class: "pin__sub" }, "Any four digits — this demo isn't locking anything"),
      h(
        "div",
        { class: "pin__dots", "aria-label": `${state.pinBuffer.length} of 4 digits entered` },
        [0, 1, 2, 3].map((i) => h("span", { class: `pin__dot${i < state.pinBuffer.length ? " is-filled" : ""}` })),
      ),
    ),
    h(
      "div",
      { class: "pin__pad" },
      KEYS.map((key) => {
        if (key.fingerprint) {
          return h(
            "button",
            {
              type: "button",
              class: "pin__key pin__key--flat pin__key--fingerprint",
              "aria-label": "Unlock with fingerprint",
              onclick: (event) => {
                if (event.detail > 0 && fromOpeningGesture()) return
                vibrate([8, 30, 12])
                unlock()
                announce("Unlocked with fingerprint")
              },
            },
            h("span", { html: icon("fingerprint", { size: 52, stroke: 1.6 }) }),
          )
        }
        if (key.backspace) {
          return h(
            "button",
            { type: "button", class: "pin__key pin__key--flat", "aria-label": "Delete", onclick: (event) => backspace(event.detail > 0) },
            h("span", { html: icon("delete", { size: 34, stroke: 1.7 }) }),
          )
        }
        return h(
          "button",
          { type: "button", class: "pin__key", "aria-label": key.digit, onclick: (event) => press(key.digit, event.detail > 0) },
          key.digit,
          key.letters ? h("small", null, key.letters) : null,
        )
      }),
    ),
    h("button", { type: "button", class: "pin__cancel", onclick: () => store.set({ pinOpen: false, pinBuffer: "" }) }, "Cancel"),
  )
}

export function renderLock(el, state, { enter = false } = {}) {
  if (state.unlocked) {
    fill(el)
    return
  }
  const unread = state.notifications.filter((n) => !n.read)
  const shown = state.notifications.slice(0, 2)
  const now = new Date(state.clock)
  const w = demo.WEATHER
  fill(
    el,
    h(
      "div",
      { class: "lock", id: "lock" },
      h("div", { class: "lock__scrim" }),
      h(
        "div",
        { class: "lock__glance" },
        h(
          "div",
          null,
          h("div", { class: "lock__clock mono" }, time12(now).replace(/\s?[AP]M$/, "")),
          h("div", { class: "lock__date" }, longDate(now)),
          unread.length ? h("div", { class: "lock__unread" }, `${unread.length} notification${unread.length === 1 ? "" : "s"}`) : null,
        ),
        h(
          "div",
          { class: "lock__weather mono" },
          h("div", { class: "temp" }, h("span", { html: icon(w.icon, { size: 34, stroke: 1.7 }) }), `${w.temp}°`),
          h("div", { class: "place" }, w.place),
        ),
      ),
      h(
        "div",
        { class: `lock__notifications${enter ? " lock__notifications--enter" : ""}`, id: "lock-notifications" },
        shown.map((n) =>
          notificationCard(n, {
            onOpen: () => {
              openPin()
              setTimeout(() => openNotification(n), 0)
            },
            onDismiss: dismissNotification,
            dismissible: false,
          }),
        ),
        state.notifications.length > shown.length
          ? h("div", { class: "lock__more" }, `+${state.notifications.length - shown.length} more`)
          : null,
      ),
      h(
        "div",
        { class: "lock__media" },
        h("span", { html: icon(state.media.playing ? "pause" : "play", { size: 24 }), style: { color: "var(--accent)" } }),
        h("div", null, state.media.title, h("small", null, `${state.media.artist} — ${state.media.album}`)),
        h("span", { class: "spacer" }),
        h("span", { html: icon("music", { size: 22 }), style: { color: "var(--fg-dim)" } }),
      ),
      h(
        "button",
        {
          type: "button",
          class: "lock__hint",
          onclick: openPin,
          "aria-label": "Unlock",
        },
        h("span", { html: icon("chevron-up", { size: 26 }) }),
        "Swipe up to unlock",
      ),
      state.pinOpen ? pinPad(state) : null,
    ),
  )
}
