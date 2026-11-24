// SPDX-License-Identifier: MIT
// The home screens: two pages of widgets on the wallpaper, the dock, the page
// dots and the search bar that opens the app drawer.

import { h, fill, longDate, shortWeekday, MONTHS } from "./util.js"
import { icon } from "./icons.js"
import { store, isOn, unreadCount, missedCalls, openApp, demo } from "./store.js"
import { themeById } from "./theme.js"
import { appIcon, archMark } from "./ui.js"

const PALETTE = ["--red", "--yellow", "--green", "--cyan", "--blue", "--magenta"]

function systemWidget(state) {
  const d = demo.DEVICE
  const theme = themeById(state.theme)
  const batteryLine = `${state.battery.level}%${state.battery.charging ? " · charging" : ""}`
  const rows = [
    ["os", "Omarchy"],
    ["host", d.name],
    ["kernel", d.kernel],
    ["uptime", d.uptime],
    ["packages", `${d.packages} (pacman)`],
    ["shell", d.shell],
    ["theme", theme.name.toLowerCase()],
    ["cpu", d.cpu],
    ["memory", `${d.memory.used} / ${d.memory.total} (${d.memory.percent}%)`],
    ["disk", `${d.disk.used} / ${d.disk.total} (${d.disk.percent}%)`],
    ["battery", batteryLine],
  ]
  return h(
    "div",
    { class: "widget widget--system", "aria-label": "System information widget" },
    h("div", { class: "widget__head" }, archMark(36), h("div", null, h("span", { class: "widget__user" }, "root"), "@pixel-7-pro")),
    h("div", { class: "widget__palette", "aria-hidden": "true" }, PALETTE.map((tone) => h("span", { style: { background: `var(${tone})` } }))),
    h("dl", { class: "widget__rows" }, rows.map(([label, value]) => [h("dt", null, label), h("dd", { title: value }, value)])),
  )
}

function weatherIcon(name, size = 30) {
  return h("span", { html: icon(name, { size, stroke: 1.7 }) })
}

function clockWidget(state) {
  const now = new Date(state.clock)
  const w = demo.WEATHER
  const days = w.forecast.map((f) => {
    const date = new Date(state.clock + f.day * 86400000)
    return h(
      "div",
      { class: "day" },
      h("span", null, shortWeekday(date)),
      weatherIcon(f.icon, 26),
      h("span", { class: "temps" }, `${f.high}° ${f.low}°`),
    )
  })
  return h(
    "div",
    { class: "widget widget--clock", "aria-label": "Clock and weather widget" },
    h("div", { class: "clock-widget__kicker mono" }, "today"),
    h(
      "div",
      { class: "clock-widget__top" },
      h("div", { class: "clock-widget__day mono" }, String(now.getDate())),
      h("div", { class: "clock-widget__month mono" }, h("div", null, longDate(now).split(",")[0].toLowerCase()), h("div", null, `${MONTHS[now.getMonth()].toLowerCase()} ${now.getFullYear()}`)),
    ),
    h("div", { class: "clock-widget__rule" }),
    h(
      "div",
      { class: "clock-widget__now" },
      weatherIcon(w.icon, 40),
      h("div", { class: "clock-widget__temp mono" }, `${w.temp}°`),
      h(
        "div",
        { class: "clock-widget__sky mono" },
        h("div", null, w.condition),
        h("div", null, `↑${w.high}°  ↓${w.low}°`),
      ),
    ),
    h("div", { class: "clock-widget__feels mono" }, "feels ", h("b", null, `${w.feels}°`), " · ", w.place),
    h("div", { class: "clock-widget__rule" }),
    h(
      "div",
      { class: "clock-widget__forecast mono" },
      days,
    ),
    h(
      "div",
      { class: "clock-widget__sun mono" },
      h("div", null, weatherIcon("sun", 17), h("span", null, `rise ${w.sun.rise}`)),
      h("div", null, weatherIcon("moon", 17), h("span", null, `set ${w.sun.set}`)),
    ),
  )
}

function agendaWidget() {
  return h(
    "div",
    { class: "widget widget--agenda" },
    h("div", { class: "widget__head" }, h("span", { html: icon("calendar", { size: 22 }) }), "Today"),
    demo.AGENDA.map((item) =>
      h(
        "div",
        { class: "agenda__row" },
        h("span", { class: "time" }, item.time),
        h("span", null, item.title),
        h("span", { class: "place" }, item.place),
      ),
    ),
  )
}

function mediaWidget(state) {
  const m = state.media
  return h(
    "div",
    { class: "widget widget--media" },
    h("div", { class: "widget__head" }, h("span", { html: icon("music", { size: 22 }) }), "Now playing"),
    h(
      "div",
      { class: "media__row" },
      h("div", { class: "media__art", html: icon("music", { size: 32 }) }),
      h("div", { class: "media__meta" }, m.title, h("small", null, `${m.artist} — ${m.album}`)),
      h(
        "div",
        { class: "media__controls" },
        h("button", { type: "button", "aria-label": "Previous" }, h("span", { html: icon("skip-back", { size: 24 }) })),
        h(
          "button",
          {
            type: "button",
            "aria-label": m.playing ? "Pause" : "Play",
            onclick: () => store.set((s) => ({ media: { ...s.media, playing: !s.media.playing } })),
          },
          h("span", { html: icon(m.playing ? "pause" : "play", { size: 26 }) }),
        ),
        h("button", { type: "button", "aria-label": "Next" }, h("span", { html: icon("skip-forward", { size: 24 }) })),
      ),
    ),
    h("div", { class: "media__progress" }, h("span", { style: { width: `${Math.round(m.position * 100)}%` } })),
  )
}

function togglesWidget(state) {
  const ids = ["wifi", "bluetooth", "dnd", "rotation"]
  return h(
    "div",
    { class: "widget widget--toggles" },
    h("div", { class: "widget__head" }, h("span", { html: icon("sliders", { size: 22 }) }), "Quick settings"),
    h(
      "div",
      { class: "toggles" },
      ids.map((id) => {
        const t = state.tiles.find((x) => x.id === id)
        return h(
          "button",
          {
            type: "button",
            class: isOn(id) ? "is-on" : "",
            onclick: () => store.set({ shade: true }),
          },
          h("span", { html: icon(t.icon, { size: 24 }) }),
          t.label,
        )
      }),
    ),
  )
}

function notesWidget() {
  return h(
    "div",
    { class: "widget widget--notes" },
    h("div", { class: "widget__head" }, h("span", { html: icon("notes", { size: 22 }) }), "Notes"),
    demo.NOTES.map((n) => h("div", { class: "notes__row" }, h("b", null, n.title), h("span", null, n.body))),
  )
}

function galleryWidget() {
  return h(
    "div",
    { class: "widget widget--notes", style: { display: "grid", placeItems: "center", textAlign: "center", color: "var(--fg-dim)" } },
    h(
      "div",
      null,
      h("div", { html: icon("plus", { size: 30 }), style: { display: "flex", justifyContent: "center", marginBottom: "8px" } }),
      h("div", { style: { fontSize: "21px" } }, "Add widgets and themes"),
      h(
        "button",
        { type: "button", class: "hud-btn", style: { marginTop: "12px" }, onclick: () => store.set({ sheet: { kind: "theme" }, shade: false }) },
        "Open Appearance",
      ),
    ),
  )
}

function dock(state) {
  const badges = { messages: unreadCount(), phone: missedCalls().length, contacts: 0, camera: 0 }
  return h(
    "div",
    { class: "dock", id: "dock" },
    demo.DOCK.map((id) => {
      const app = demo.apps().find((a) => a.id === id)
      return h(
        "button",
        {
          type: "button",
          class: "dock__app",
          onclick: () => openApp(id),
          "aria-label": app.name + (badges[id] ? `, ${badges[id]} waiting` : ""),
        },
        appIcon(app, { badge: badges[id] }),
        h("span", null, app.name),
      )
    }),
  )
}

export function renderHome(el, state) {
  const page = Math.max(0, Math.min(2, state.page))
  fill(
    el,
    h(
      "div",
      { class: "home" },
      h(
        "div",
        { class: "home__viewport", id: "home-viewport" },
        h(
          "div",
          { class: "home__track", id: "home-track", style: { transform: `translateX(-${page * 33.3333}%)` } },
          h("div", { class: "home__page" }, systemWidget(state), clockWidget(state)),
          h("div", { class: "home__page" }, agendaWidget(), mediaWidget(state), togglesWidget(state)),
          h("div", { class: "home__page" }, notesWidget(), galleryWidget()),
        ),
      ),
      dock(state),
      h(
        "div",
        { class: "page-dots", role: "tablist", "aria-label": "Home screens" },
        [0, 1, 2].map((i) =>
          h("button", {
            type: "button",
            class: i === page ? "is-active" : "",
            role: "tab",
            "aria-selected": String(i === page),
            "aria-label": `Home screen ${i + 1}`,
            onclick: () => store.set({ page: i }),
          }),
        ),
      ),
      h(
        "button",
        { type: "button", class: "searchbar", id: "home-search", onclick: () => store.set({ drawer: true, drawerQuery: "" }) },
        h("span", { html: icon("search", { size: 30 }) }),
        h("span", { style: { flex: "1", textAlign: "left", fontSize: "26px" } }, "Search apps or ask Claude Code…"),
        h("span", { html: icon("mic", { size: 26, stroke: 1.7 }) }),
      ),
      h("div", { class: "safe-bottom" }),
    ),
  )
}
