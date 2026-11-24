// SPDX-License-Identifier: MIT
// The phone's apps. Each one is a function from state to a screen inside the
// shared window chrome; the ones with real content use the demo stores from
// docs/DEMO.md, and the rest say plainly that they are not simulated.

import { h, fill, relativeDay, formatPhone, longDate, startOfDay, WEEKDAYS, MONTHS } from "./util.js"
import { icon } from "./icons.js"
import { store, appBack, openApp, openThread, sendMessage, markCallsSeen, demo, contactById, titleForThread, titleForCall } from "./store.js"
import { THEMES, themeById, swatchFor } from "./theme.js"
import { avatar, appIcon } from "./ui.js"

const CALL_LABEL = {
  answered: "Answered",
  missed: "Missed",
  rejected: "Declined",
  unanswered: "No answer",
  failed: "Failed",
}

function duration(seconds) {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m ? `${m}m ${s}s` : `${s}s`
}

function frame({ title, subtitle, actions, body, back = true, id }) {
  return h(
    "div",
    { class: "app", id: `app-${id}` },
    h(
      "div",
      { class: "app__header" },
      back
        ? h(
            "button",
            { type: "button", class: "app__back", "aria-label": "Back", onclick: appBack },
            h("span", { html: icon("chevron-left", { size: 32, stroke: 2 }) }),
          )
        : h("div", { style: { width: "14px" } }),
      h("div", { style: { minWidth: "0" } }, h("div", { class: "app__title" }, title), subtitle ? h("div", { class: "app__subtitle" }, subtitle) : null),
      actions ? h("div", { class: "app__actions" }, actions) : null,
    ),
    h("div", { class: "app__body" }, body),
  )
}

// ---- messages -------------------------------------------------------------

function lastMessage(thread) {
  return thread.messages[thread.messages.length - 1]
}

function messagesApp(state) {
  const threadId = state.app.params?.thread
  if (threadId) return threadView(state, threadId)
  const threads = [...state.threads].sort((a, b) => lastMessage(b).at - lastMessage(a).at)
  return frame({
    id: "messages",
    title: "Messages",
    subtitle: `${threads.reduce((n, t) => n + t.unread, 0)} unread`,
    actions: [h("button", { type: "button", "aria-label": "New message", onclick: () => store.set({ sheet: { kind: "desktop-app", app: { name: "New message", icon: "plus" } } }) }, h("span", { html: icon("plus", { size: 26 }) }))],
    body: h(
      "div",
      { class: "app__scroll", id: "messages-list" },
      threads.map((thread) => {
        const last = lastMessage(thread)
        const contact = thread.contactId ? contactById(thread.contactId) : null
        return h(
          "button",
          {
            type: "button",
            class: `thread-row${thread.unread ? " is-unread" : ""}`,
            onclick: () => openThread(thread.id),
          },
          avatar(contact, { name: titleForThread(thread) }),
          h(
            "div",
            { class: "thread-row__main" },
            h(
              "div",
              { class: "thread-row__top" },
              h("span", { class: "thread-row__name" }, titleForThread(thread)),
              h("span", { class: "thread-row__time" }, relativeDay(last.at, state.clock)),
            ),
            h("div", { class: "thread-row__snippet" }, `${last.dir === "out" ? "You: " : ""}${last.text}`),
          ),
          thread.unread ? h("span", { class: "thread-row__badge" }, thread.unread) : null,
        )
      }),
    ),
  })
}

function dayLabel(ms, now) {
  const d = new Date(ms)
  const today = startOfDay(new Date(now))
  const that = startOfDay(d)
  const diff = Math.round((today - that) / 86400000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff < 7) return WEEKDAYS[d.getDay()]
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}

function threadView(state, threadId) {
  const thread = state.threads.find((t) => t.id === threadId)
  if (!thread) return messagesApp({ ...state, app: { id: "messages", params: {} } })
  const contact = thread.contactId ? contactById(thread.contactId) : null
  let lastDay = null
  const rows = []
  for (const m of thread.messages) {
    const label = dayLabel(m.at, state.clock)
    if (label !== lastDay) {
      rows.push(h("div", { class: "thread__day" }, label))
      lastDay = label
    }
    rows.push(
      h(
        "div",
        { class: `bubble bubble--${m.dir === "out" ? "out" : "in"}` },
        m.text,
        m.dir === "out" && m.state ? h("span", { class: "bubble__state" }, m.state === "sending" ? "sending…" : m.state) : null,
      ),
    )
  }
  const input = h("input", {
    type: "text",
    placeholder: "Text message",
    "aria-label": "Message",
    "data-focus": "composer",
    autocomplete: "off",
    onkeydown: (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        submit()
      }
    },
  })
  const submit = () => {
    if (!input.value.trim()) return
    sendMessage(thread.id, input.value)
    input.value = ""
    requestAnimationFrame(() => {
      const scroller = document.getElementById("thread-scroll")
      if (scroller) scroller.scrollTop = scroller.scrollHeight
    })
    input.focus({ preventScroll: true })
  }
  return frame({
    id: "messages-thread",
    title: titleForThread(thread),
    subtitle: formatPhone(thread.address),
    actions: [
      h("button", { type: "button", "aria-label": "Call", onclick: () => store.set({ sheet: { kind: "call", number: thread.address, name: titleForThread(thread) } }) }, h("span", { html: icon("phone", { size: 24 }) })),
    ],
    body: [
      h("div", { class: "thread", id: "thread-scroll" }, rows),
      h(
        "div",
        { class: "composer" },
        input,
        h("button", { type: "button", class: "composer__send", "aria-label": "Send", onclick: submit }, h("span", { html: icon("arrow-up-right", { size: 28 }) })),
      ),
    ],
  })
}

// ---- phone ----------------------------------------------------------------

let phoneTab = "recents"
let dialed = ""

function phoneApp(state) {
  const body =
    phoneTab === "keypad"
      ? keypadView()
      : phoneTab === "contacts"
        ? contactsList(state, { inPhone: true })
        : recentsView(state)
  return frame({
    id: "phone",
    title: "Phone",
    subtitle: "No modem in this demo",
    actions: [],
    body: [
      h(
        "div",
        { class: "tabs", role: "tablist" },
        ["recents", "keypad", "contacts"].map((tab) =>
          h(
            "button",
            {
              type: "button",
              role: "tab",
              class: phoneTab === tab ? "is-active" : "",
              "aria-selected": String(phoneTab === tab),
              onclick: () => {
                phoneTab = tab
                store.touch()
              },
            },
            tab.charAt(0).toUpperCase() + tab.slice(1),
          ),
        ),
      ),
      body,
    ],
  })
}

function recentsView(state) {
  const missed = state.calls.filter((c) => c.direction === "in" && c.outcome === "missed" && !c.seen)
  return h(
    "div",
    { class: "app__scroll" },
    missed.length ? h("div", { class: "section-label", style: { color: "var(--red)" } }, `${missed.length} missed`) : null,
    state.calls.map((call) => {
      const name = titleForCall(call)
      const contact = call.contactId ? contactById(call.contactId) : null
      const isMissed = call.direction === "in" && call.outcome === "missed"
      return h(
        "div",
        { class: "call-row" },
        avatar(contact, { name }),
        h(
          "div",
          { style: { minWidth: "0" } },
          h("div", { class: `call-row__name${isMissed && !call.seen ? " is-missed" : ""}` }, name),
          h(
            "div",
            { class: "call-row__meta" },
            `${call.direction === "out" ? "Outgoing" : "Incoming"} · ${CALL_LABEL[call.outcome] || call.outcome}${call.duration ? ` · ${duration(call.duration)}` : ""} · ${relativeDay(call.at, state.clock)}`,
          ),
        ),
        h("span", { class: "call-row__icon", html: icon(call.direction === "out" ? "phone-out" : "phone-in", { size: 22 }) }),
        h(
          "button",
          {
            type: "button",
            class: "call-row__call",
            "aria-label": `Call ${name}`,
            onclick: () => store.set({ sheet: { kind: "call", number: call.contactId ? contactById(call.contactId)?.number : call.address, name } }),
          },
          h("span", { html: icon("phone", { size: 24 }) }),
        ),
      )
    }),
  )
}

const KEYPAD = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
]

function keypadView() {
  return h(
    "div",
    { class: "app__scroll", style: { overflow: "hidden" } },
    h("div", { class: "keypad__number" }, dialed || " "),
    h(
      "div",
      { class: "keypad" },
      KEYPAD.map(([key, letters]) =>
        h(
          "button",
          {
            type: "button",
            class: "keypad__key",
            onclick: () => {
              dialed += key
              store.touch()
            },
          },
          key,
          letters ? h("small", null, letters) : null,
        ),
      ),
    ),
    h(
      "div",
      { class: "keypad__call" },
      dialed
        ? h(
            "button",
            {
              type: "button",
              class: "call-btn",
              "aria-label": "Call",
              onclick: () => store.set({ sheet: { kind: "call", number: dialed, name: dialed } }),
            },
            h("span", { html: icon("phone", { size: 40 }) }),
          )
        : h(
            "button",
            {
              type: "button",
              class: "call-btn",
              disabled: true,
              style: { opacity: "0.35" },
              "aria-label": "Delete",
              onclick: () => {
                dialed = dialed.slice(0, -1)
                store.touch()
              },
            },
            h("span", { html: icon("delete", { size: 34 }) }),
          ),
    ),
    dialed
      ? h(
          "div",
          { style: { textAlign: "center", paddingTop: "4px" } },
          h(
            "button",
            {
              type: "button",
              class: "hud-btn",
              onclick: () => {
                dialed = dialed.slice(0, -1)
                store.touch()
              },
            },
            "Delete",
          ),
        )
      : null,
  )
}

// ---- contacts -------------------------------------------------------------

let contactQuery = ""

function contactsList(state, { inPhone = false } = {}) {
  const matches = state.contacts.filter((c) => !contactQuery || c.name.toLowerCase().includes(contactQuery.toLowerCase()))
  const starred = matches.filter((c) => c.starred)
  const rest = matches.filter((c) => !c.starred)
  const row = (c) =>
    h(
      "button",
      {
        type: "button",
        class: "contact-row",
        onclick: () => {
          if (inPhone) store.set({ sheet: { kind: "contact", contact: c } })
          else openApp("contacts", { contact: c.id })
        },
      },
      avatar(c),
      h("div", { class: "thread-row__main" }, h("div", { class: "contact-row__name" }, c.name), h("div", { class: "contact-row__note" }, c.note || formatPhone(c.number))),
      c.starred ? h("span", { class: "contact-row__star", html: icon("star", { size: 22 }) }) : null,
    )
  return h(
    "div",
    { class: "app__scroll" },
    h(
      "div",
      { class: "drawer__search", style: { margin: "4px 16px 10px", height: "72px" } },
      h("span", { html: icon("search", { size: 24 }) }),
      h("input", {
        type: "search",
        placeholder: "Search contacts",
        value: contactQuery,
        "aria-label": "Search contacts",
        "data-focus": "contact-search",
        oninput: (event) => {
          contactQuery = event.target.value
          const list = document.getElementById("contacts-scroll")
          if (list) {
            const fresh = contactsList(store.get(), { inPhone })
            list.replaceWith(fresh)
            const input = document.querySelector('[data-focus="contact-search"]')
            input?.focus({ preventScroll: true })
          }
        },
      }),
    ),
    starred.length ? h("div", { class: "section-label" }, "Favourites") : null,
    starred.map(row),
    rest.length ? h("div", { class: "section-label" }, `All contacts · ${state.contacts.length}`) : null,
    rest.map(row),
  )
}

function contactsApp(state) {
  const id = state.app.params?.contact
  if (id) return contactDetail(state, id)
  return frame({
    id: "contacts",
    title: "Contacts",
    subtitle: `${state.contacts.length} in the vdir`,
    actions: [h("button", { type: "button", "aria-label": "Add contact", onclick: () => store.set({ sheet: { kind: "desktop-app", app: { name: "New contact", icon: "plus" } } }) }, h("span", { html: icon("plus", { size: 26 }) }))],
    body: contactsList(state),
  })
}

function contactDetail(state, id) {
  const c = contactById(id)
  if (!c) return contactsApp({ ...state, app: { id: "contacts", params: {} } })
  return frame({
    id: "contact-detail",
    title: "",
    body: h(
      "div",
      { class: "app__scroll" },
      h(
        "div",
        { class: "contact-hero" },
        avatar(c, { large: true }),
        h("div", { class: "contact-hero__name" }, c.name),
        h(
          "div",
          { class: "contact-hero__actions" },
          h("button", { type: "button", class: "round-action", "aria-label": `Call ${c.name}`, onclick: () => store.set({ sheet: { kind: "call", number: c.number, name: c.name } }) }, h("span", { html: icon("phone", { size: 30 }) })),
          h("button", { type: "button", class: "round-action", "aria-label": `Message ${c.name}`, onclick: () => openThread(c.id) }, h("span", { html: icon("message", { size: 30 }) })),
        ),
      ),
      h(
        "div",
        { class: "contact-detail" },
        h("div", { class: "contact-detail__row" }, h("span", { html: icon("phone", { size: 22 }) }), formatPhone(c.number)),
        h("div", { class: "contact-detail__row" }, h("span", { html: icon("message", { size: 22 }) }), c.email),
        c.note ? h("div", { class: "contact-detail__row" }, h("span", { html: icon("notes", { size: 22 }) }), c.note) : null,
        h("div", { class: "contact-detail__row" }, h("span", { html: icon("star", { size: 22, style: "color: var(--yellow)" }) }), c.starred ? "Favourite" : "Not a favourite"),
      ),
      h("p", { class: "app__empty" }, "Contacts live in a vdir of vCards on the phone, so any app can read them. This one is made up."),
    ),
  })
}

// ---- appearance -----------------------------------------------------------

function appearanceApp(state) {
  return frame({
    id: "appearance",
    title: "Appearance",
    subtitle: themeById(state.theme).name,
    body: h(
      "div",
      { class: "app__scroll" },
      h(
        "div",
        { class: "appearance" },
        THEMES.map((theme) => {
          const [bg, accent, extra] = swatchFor(theme.id)
          return h(
            "button",
            {
              type: "button",
              class: `appearance__card${theme.id === state.theme ? " is-active" : ""}`,
              onclick: () => store.set({ theme: theme.id }),
            },
            h(
              "div",
              { class: "appearance__preview", style: { background: `linear-gradient(150deg, ${bg}, ${extra})` } },
              h("span", { style: { background: accent } }),
              h("span", { style: { background: bg } }),
            ),
            h("div", { class: "appearance__name" }, theme.name),
            h("div", { class: "appearance__mode" }, theme.mode),
          )
        }),
      ),
      h(
        "button",
        { type: "button", class: "setting-row", onclick: () => store.set((s) => ({ wallpaper: !s.wallpaper })) },
        h("span", { html: icon("camera", { size: 24 }), style: { color: "var(--fg-mid)" } }),
        h("div", null, h("div", { class: "setting-row__label" }, "Wallpaper"), h("div", { class: "setting-row__detail" }, state.wallpaper ? "Drawn from the theme" : "Off — plain background")),
        h("span", { class: `switch${state.wallpaper ? " is-on" : ""}` }),
      ),
      h(
        "button",
        { type: "button", class: "setting-row", onclick: () => store.set({ sheet: { kind: "about" } }) },
        h("span", { html: icon("info", { size: 24 }), style: { color: "var(--fg-mid)" } }),
        h("div", null, h("div", { class: "setting-row__label" }, "About this demo"), h("div", { class: "setting-row__detail" }, "What is real and what is not")),
        h("span", { html: icon("chevron-right", { size: 24 }), style: { marginLeft: "auto", color: "var(--fg-dim)" } }),
      ),
      h("p", { class: "app__empty" }, "Themes are Omarchy's own: on the phone they recolour the bar, the panels, the apps and the lock screen in one go."),
    ),
  })
}

// ---- calendar / weather / notes -------------------------------------------

function calendarApp(state) {
  const now = new Date(state.clock)
  const tomorrow = new Date(state.clock + 86400000)
  return frame({
    id: "calendar",
    title: "Calendar",
    subtitle: longDate(now),
    body: h(
      "div",
      { class: "app__scroll" },
      h("div", { class: "section-label" }, "Today"),
      h(
        "div",
        { class: "calendar-day" },
        demo.AGENDA.map((item) =>
          h(
            "div",
            { class: "calendar-event" },
            h("div", { class: "calendar-event__time" }, item.time),
            h("div", null, h("div", { class: "calendar-event__title" }, item.title), h("div", { class: "calendar-event__place" }, item.place)),
          ),
        ),
      ),
      h("div", { class: "section-label" }, `Tomorrow · ${WEEKDAYS[tomorrow.getDay()]}`),
      h(
        "div",
        { class: "calendar-day" },
        h(
          "div",
          { class: "calendar-event", style: { borderLeftColor: "var(--magenta)" } },
          h("div", { class: "calendar-event__time" }, "19:00"),
          h("div", null, h("div", { class: "calendar-event__title" }, "Birthday dinner"), h("div", { class: "calendar-event__place" }, "Priya's — bring a red")),
        ),
      ),
    ),
  })
}

function weatherApp(state) {
  const w = demo.WEATHER
  return frame({
    id: "weather",
    title: "Weather",
    subtitle: w.place,
    body: h(
      "div",
      { class: "app__scroll" },
      h(
        "div",
        { class: "weather-hero" },
        h("span", { html: icon(w.icon, { size: 84, stroke: 1.4 }), style: { color: "var(--yellow)" } }),
        h("div", { class: "weather-hero__temp" }, `${w.temp}°`),
        h("div", { class: "weather-hero__place" }, w.place),
        h("div", { class: "weather-hero__cond" }, `${w.condition} · feels ${w.feels}° · ↑${w.high}° ↓${w.low}°`),
      ),
      h(
        "div",
        { class: "weather-days" },
        w.forecast.map((f) => {
          const date = new Date(state.clock + f.day * 86400000)
          return h(
            "div",
            { class: "weather-day" },
            h("span", { style: { minWidth: "110px" } }, WEEKDAYS[date.getDay()]),
            h("span", { html: icon(f.icon, { size: 26 }) }),
            h("span", { style: { minWidth: "90px" } }, `${f.low}°`),
            h("span", { class: "weather-day__bar" }),
            h("span", { style: { minWidth: "90px", textAlign: "right" } }, `${f.high}°`),
          )
        }),
      ),
      h("p", { class: "app__empty" }, `Sunrise ${w.sun.rise}, sunset ${w.sun.set}. On the phone this comes from Open-Meteo, cached in ~/.local/state/omamobile/weather.json for the lock screen's glance.`),
    ),
  })
}

function notesApp() {
  return frame({
    id: "notes",
    title: "Notes",
    subtitle: `${demo.NOTES.length} notes`,
    body: h(
      "div",
      { class: "app__scroll" },
      h("div", { style: { height: "10px" } }),
      demo.NOTES.map((n) =>
        h("div", { class: "note-card" }, h("b", null, n.title), h("span", null, n.body)),
      ),
      h("p", { class: "app__empty" }, "Notes is one of the widgets too — swipe along the home screens to see it."),
    ),
  })
}

// ---- camera / settings / terminal -----------------------------------------

function cameraApp() {
  return frame({
    id: "camera",
    title: "Camera",
    subtitle: "omacam",
    body: h(
      "div",
      { class: "placeholder" },
      h("div", { class: "app-icon", html: icon("camera", { size: 60, stroke: 1.5 }) }),
      h("h2", null, "No camera here"),
      h("p", null, "On the phone this is omacam, the camera app built for Omamobile. A browser demo has no sensor to show you, so there is no viewfinder to fake."),
    ),
  })
}

function settingsApp(state) {
  const d = demo.DEVICE
  return frame({
    id: "settings",
    title: "Settings",
    subtitle: `${d.name} · ${d.codename}`,
    body: h(
      "div",
      { class: "app__scroll" },
      h("div", { class: "section-label" }, "This demo"),
      h(
        "button",
        { type: "button", class: "setting-row", onclick: () => store.set({ sheet: { kind: "about" } }) },
        h("span", { html: icon("info", { size: 24 }), style: { color: "var(--accent)" } }),
        h("div", null, h("div", { class: "setting-row__label" }, "About the demo"), h("div", { class: "setting-row__detail" }, "What is simulated, and where it comes from")),
      ),
      h(
        "button", { type: "button", class: "setting-row", onclick: () => window.omaInstall?.() },
        h("span", { html: icon("plus", { size: 24 }), style: { color: "var(--green)" } }),
        h("div", null, h("div", { class: "setting-row__label" }, "Install on this device"), h("div", { class: "setting-row__detail" }, "Adds the demo to your home screen as an app")),
      ),
      h(
        "button", { type: "button", class: "setting-row", onclick: () => store.set({ sheet: { kind: "theme" } }) },
        h("span", { html: icon("sliders", { size: 24 }), style: { color: "var(--magenta)" } }),
        h("div", null, h("div", { class: "setting-row__label" }, "Themes"), h("div", { class: "setting-row__detail" }, themeById(state.theme).name)),
      ),
      h("div", { class: "section-label" }, "Device"),
      h("div", { class: "contact-detail", style: { marginTop: "0" } }, [
        ["SoC", `${d.soc} — Tensor G2`],
        ["Kernel", `${d.kernel} (mainline)`],
        ["Display", `${d.width}×${d.height} logical, half the panel`],
        ["Packages", `${d.packages} (pacman)`],
        ["Shell", "Omarchy 4.5"],
      ].map(([label, value]) =>
        h("div", { class: "contact-detail__row", style: { justifyContent: "space-between" } }, h("span", null, label), h("span", { style: { color: "var(--fg-bright)", textAlign: "right" } }, value)),
      )),
      h("p", { class: "app__empty" }, "On the phone, Settings is Omarchy's: hyprland, themes, keyboards, the phone's own device package. Here it is a summary."),
    ),
  })
}

let terminalLines = [
  { kind: "out", text: "Omamobile demo shell · everything below is simulated.\nType `help`, `fastfetch`, `uname -a` or `theme`." },
]

function terminalApp(state) {
  const history = terminalLines.map((line) =>
    line.kind === "cmd"
      ? h("div", null, h("span", { class: "prompt" }, "root@pixel-7-pro"), h("span", { class: "path" }, ":~# "), line.text)
      : h("div", { class: line.kind }, line.text),
  )
  const input = h("input", {
    type: "text",
    "aria-label": "Terminal input",
    "data-focus": "terminal",
    autocomplete: "off",
    spellcheck: "false",
    onkeydown: (event) => {
      if (event.key !== "Enter") return
      const value = input.value.trim()
      input.value = ""
      terminalLines.push({ kind: "cmd", text: value })
      terminalLines.push(...runCommand(value, state))
      if (terminalLines.length > 40) terminalLines = terminalLines.slice(-40)
      store.touch()
      requestAnimationFrame(() => {
        const t = document.getElementById("terminal-out")
        if (t) t.scrollTop = t.scrollHeight
      })
    },
  })
  return frame({
    id: "terminal",
    title: "Terminal",
    subtitle: "foot",
    body: h(
      "div",
      { class: "terminal", id: "terminal-out" },
      history,
      h("form", { onsubmit: (event) => event.preventDefault() }, h("span", { class: "prompt" }, "root@pixel-7-pro"), h("span", { class: "path" }, ":~# "), input),
    ),
  })
}

function runCommand(value, state) {
  const cmd = value.trim()
  if (!cmd) return []
  if (cmd === "help") return [{ kind: "out", text: "help       this list\nfastfetch  the system widget, in a terminal\nuname -a   the kernel\nls         home directory\ntheme      the theme in use\nexit       close the terminal" }]
  if (cmd === "fastfetch" || cmd === "neofetch") {
    const d = demo.DEVICE
    return [
      {
        kind: "out",
        text: `       /\\          ${d.packages === 984 ? "root" : "root"}@pixel-7-pro\n      /  \\         -------------\n     /\\   \\        os: Omarchy (aarch64)\n    /      \\       host: ${d.name}\n   /   ,,   \\      kernel: ${d.kernel}\n  /   |  |  -\\     shell: ${d.shell}\n /_-''    ''-_\\    theme: ${themeById(state.theme).name.toLowerCase()}\n                   cpu: ${d.cpu}\n                   memory: ${d.memory.used} / ${d.memory.total}`,
      },
    ]
  }
  if (cmd === "uname -a") return [{ kind: "out", text: `Linux pixel-7-pro ${demo.DEVICE.kernel}-omamobile #1 SMP PREEMPT aarch64 GNU/Linux` }]
  if (cmd === "ls") return [{ kind: "out", text: "Desktop  Documents  Downloads  Music  Pictures  Videos  omamobile" }]
  if (cmd === "theme") return [{ kind: "out", text: themeById(state.theme).name }]
  if (cmd === "exit") return [{ kind: "out", text: "There is no shell to exit. This is a demo." }]
  return [{ kind: "err", text: `${cmd.split(" ")[0]}: command not found` }]
}

function placeholderApp(state) {
  return frame({
    id: "placeholder",
    title: "Not simulated",
    body: h(
      "div",
      { class: "placeholder" },
      h("div", { class: "app-icon", html: icon("info", { size: 52 }) }),
      h("h2", null, "This screen isn't part of the demo"),
      h("p", null, "Open Messages, Phone, Contacts, Camera, Appearance, Calendar, Weather or Notes to see the phone's own apps."),
    ),
  })
}

const RENDERERS = {
  messages: messagesApp,
  phone: phoneApp,
  contacts: contactsApp,
  appearance: appearanceApp,
  calendar: calendarApp,
  weather: weatherApp,
  notes: notesApp,
  camera: cameraApp,
  settings: settingsApp,
  terminal: terminalApp,
  placeholder: placeholderApp,
}

export function renderApp(el, state) {
  if (!state.app) {
    fill(el)
    return
  }
  const render = RENDERERS[state.app.id] || placeholderApp
  fill(el, render(state))
  if (state.app.id === "phone") markCallsSeenDebounced()
}

let seenTimer = 0
function markCallsSeenDebounced() {
  clearTimeout(seenTimer)
  seenTimer = setTimeout(markCallsSeen, 1200)
}

export { openApp }
