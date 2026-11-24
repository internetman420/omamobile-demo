// SPDX-License-Identifier: MIT
// The demo's fictional dataset, built to the shape of the project's own demo
// stores (omamobile docs/DEMO.md): ten made-up people, numbers in the
// 555-01xx range reserved for fiction, emails at example.com, six one-to-one
// threads over the last four days with three unread in two of them, nine
// calls with one missed call not yet seen, and five notifications.
//
// Nothing here is real. Names, numbers and messages are invented.

const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export const DEVICE = {
  codename: "cheetah",
  name: "Pixel 7 Pro",
  soc: "gs201",
  // The screen the phone ships at, halved: the demo's design space.
  width: 720,
  height: 1560,
  kernel: "7.3.0",
  packages: 984,
  shell: "bash 5.3.20",
  memory: { used: "2.5G", total: "11G", percent: 22 },
  disk: { used: "15G", total: "108G", percent: 14 },
  uptime: "1d 17h",
  cpu: "gs201 (8)",
}

export const WEATHER = {
  place: "state college",
  temp: 39,
  condition: "sunny",
  icon: "sun",
  feels: 35,
  high: 66,
  low: 39,
  forecast: [
    { day: 1, icon: "cloud-sun", high: 61, low: 43 },
    { day: 2, icon: "cloud", high: 59, low: 41 },
    { day: 3, icon: "sun", high: 64, low: 45 },
  ],
  sun: { rise: "07:35", set: "18:15" },
}

export function contacts() {
  return [
    { id: "maya", name: "Maya Okonkwo", number: "+18145550109", email: "maya@example.com", starred: true, note: "Climbing, Tuesdays" },
    { id: "tom", name: "Tom Reyes", number: "+18145550117", email: "tom.reyes@example.com", starred: false, note: "Neighbour, 4B" },
    { id: "priya", name: "Priya Shah", number: "+18145550123", email: "priya@example.com", starred: true, note: "Birthday dinner, Saturday" },
    { id: "sam", name: "Sam Whitfield", number: "+18145550132", email: "sam.w@example.com", starred: false, note: "Standup, 09:30" },
    { id: "nora", name: "Nora Lindqvist", number: "+18145550144", email: "nora@example.com", starred: false, note: "" },
    { id: "dev", name: "Dev Patel", number: "+18145550156", email: "dev.patel@example.com", starred: false, note: "" },
    { id: "lena", name: "Lena Fischer", number: "+18145550161", email: "lena@example.com", starred: true, note: "Sister" },
    { id: "marcus", name: "Marcus Webb", number: "+18145550170", email: "marcus@example.com", starred: false, note: "" },
    { id: "aiko", name: "Aiko Tanaka", number: "+18145550185", email: "aiko@example.com", starred: false, note: "" },
    { id: "judy", name: "Judy Brennan", number: "+18145550192", email: "judy@example.com", starred: false, note: "Book club" },
  ]
}

/** Threads, oldest first inside each one. `ago` is hours before load. */
export function threads(now = Date.now()) {
  return [
    {
      id: "maya",
      contactId: "maya",
      address: "+18145550109",
      unread: 2,
      messages: [
        { dir: "in", text: "are we still on for saturday?", at: now - 26 * HOUR },
        { dir: "out", text: "yes! i've got the car", at: now - 25.5 * HOUR, state: "read" },
        { dir: "in", text: "perfect. i'll bring the crash pad", at: now - 40 * MIN },
        { dir: "in", text: "weather looks good too, 61 and sunny", at: now - 34 * MIN },
      ],
    },
    {
      id: "tom",
      contactId: "tom",
      address: "+18145550117",
      unread: 1,
      messages: [
        { dir: "out", text: "did the parcel turn up?", at: now - 8 * HOUR, state: "read" },
        { dir: "in", text: "it did — left with the neighbour in 4B, she signed for it", at: now - 7.2 * HOUR },
        { dir: "in", text: "i'll grab it on my way back, no rush", at: now - 3 * HOUR },
      ],
    },
    {
      id: "priya",
      contactId: "priya",
      address: "+18145550123",
      unread: 0,
      messages: [
        { dir: "in", text: "dinner saturday at 7? mum's doing the thing with the aubergines", at: now - 30 * HOUR },
        { dir: "out", text: "wouldn't miss it. want me to bring wine?", at: now - 29 * HOUR, state: "read" },
        { dir: "in", text: "yes please, something red", at: now - 28.6 * HOUR },
        { dir: "out", text: "done 🍷", at: now - 28.5 * HOUR, state: "read" },
      ],
    },
    {
      id: "sam",
      contactId: "sam",
      address: "+18145550132",
      unread: 0,
      messages: [
        { dir: "in", text: "standup moved to 09:30 tomorrow, the room's booked for the other thing", at: now - 51 * HOUR },
        { dir: "out", text: "noted, thanks", at: now - 50 * HOUR, state: "read" },
      ],
    },
    {
      id: "nora",
      contactId: "nora",
      address: "+18145550144",
      unread: 0,
      messages: [
        { dir: "out", text: "that talk you sent me was great", at: now - 74 * HOUR, state: "read" },
        { dir: "in", text: "right? the bit about the kernel modules is exactly what we hit", at: now - 73 * HOUR },
        { dir: "in", text: "sending you the slides", at: now - 72.5 * HOUR },
      ],
    },
    {
      id: "dev",
      contactId: "dev",
      address: "+18145550156",
      unread: 0,
      messages: [
        { dir: "in", text: "the config's in the repo now, branch is `demo-data`", at: now - 96 * HOUR },
        { dir: "out", text: "got it, building", at: now - 95 * HOUR, state: "read" },
      ],
    },
  ]
}

/** Nine calls: direction in/out, outcome answered/missed/rejected/unanswered. */
export function calls(now = Date.now()) {
  return [
    { contactId: "maya", direction: "in", outcome: "missed", at: now - 20 * MIN, seen: false, duration: 0 },
    { contactId: "lena", direction: "in", outcome: "answered", at: now - 2 * HOUR, seen: true, duration: 340 },
    { contactId: "sam", direction: "out", outcome: "answered", at: now - 5 * HOUR, seen: true, duration: 92 },
    { contactId: "priya", direction: "in", outcome: "answered", at: now - 27 * HOUR, seen: true, duration: 611 },
    { address: "+18145550199", direction: "out", outcome: "unanswered", at: now - 30 * HOUR, seen: true, duration: 0 },
    { contactId: "tom", direction: "in", outcome: "rejected", at: now - 33 * HOUR, seen: true, duration: 0 },
    { contactId: "marcus", direction: "out", outcome: "answered", at: now - 50 * HOUR, seen: true, duration: 1284 },
    { contactId: "aiko", direction: "in", outcome: "answered", at: now - 74 * HOUR, seen: true, duration: 205 },
    { contactId: "judy", direction: "out", outcome: "missed", at: now - 98 * HOUR, seen: true, duration: 0 },
  ]
}

/** The five notifications docs/DEMO.md sends, newest first. */
export function notifications(now = Date.now()) {
  return [
    {
      id: "update",
      app: "Omarchy",
      icon: "refresh",
      title: "Omarchy 4.5.0-3 is available",
      body: "268 packages to update. Open the update sheet to review.",
      at: now - 6 * MIN,
      read: false,
      kind: "system",
    },
    {
      id: "calendar",
      app: "Calendar",
      icon: "calendar",
      title: "Standup in 15 minutes",
      body: "Moved to 09:30 — Room booked for the other thing.",
      at: now - 11 * MIN,
      read: false,
      kind: "calendar",
    },
    {
      id: "call",
      app: "Phone",
      icon: "phone",
      title: "Missed call · Maya Okonkwo",
      body: "Tap to call back, or open Phone to see the last four days.",
      at: now - 20 * MIN,
      read: false,
      kind: "call",
    },
    {
      id: "msg-maya",
      app: "Messages",
      icon: "message",
      title: "Maya Okonkwo",
      body: "weather looks good too, 61 and sunny",
      at: now - 34 * MIN,
      read: false,
      kind: "message",
      thread: "maya",
    },
    {
      id: "msg-tom",
      app: "Messages",
      icon: "message",
      title: "Tom Reyes",
      body: "i'll grab it on my way back, no rush",
      at: now - 3 * HOUR,
      read: true,
      kind: "message",
      thread: "tom",
    },
  ]
}

/** The app drawer. `app` is a demo app id, `desktop` is a real Omarchy app
 *  the demo only shows the tile for. */
export function apps() {
  return [
    { id: "messages", name: "Messages", icon: "message", app: "messages" },
    { id: "phone", name: "Phone", icon: "phone", app: "phone" },
    { id: "contacts", name: "Contacts", icon: "users", app: "contacts" },
    { id: "camera", name: "Camera", icon: "camera", app: "camera" },
    { id: "appearance", name: "Appearance", icon: "sliders", app: "appearance" },
    { id: "settings", name: "Settings", icon: "gear", app: "settings" },
    { id: "notes", name: "Notes", icon: "notes", app: "notes" },
    { id: "calendar", name: "Calendar", icon: "calendar", app: "calendar" },
    { id: "weather", name: "Weather", icon: "cloud-sun", app: "weather" },
    { id: "clock", name: "Clock", icon: "clock", app: "placeholder", desktop: true },
    { id: "chromium", name: "Chromium", icon: "globe", app: "placeholder", desktop: true },
    { id: "files", name: "Files", icon: "folder", app: "placeholder", desktop: true },
    { id: "foot", name: "Foot", icon: "terminal", app: "placeholder", desktop: true },
    { id: "omawrite", name: "Omawrite", icon: "notes", app: "placeholder", desktop: true },
    { id: "loupe", name: "Loupe", icon: "camera", app: "placeholder", desktop: true },
    { id: "maps", name: "Maps", icon: "map-pin", app: "placeholder", desktop: true },
    { id: "music", name: "Music", icon: "music", app: "placeholder", desktop: true },
    { id: "terminal", name: "Terminal", icon: "terminal", app: "terminal" },
  ]
}

export const DOCK = ["messages", "phone", "contacts", "camera"]

export const AGENDA = [
  { time: "09:30", title: "Standup", place: "Room 3 · moved from 09:00" },
  { time: "13:00", title: "Lunch with Nora", place: "The place with the good soup" },
  { time: "18:30", title: "Climbing", place: "Bring the crash pad" },
]

export const MEDIA = { title: "Nightswimming", artist: "R.E.M.", album: "Automatic for the People", playing: false, position: 0.35 }

export const NOTES = [
  { title: "Parcel", body: "With the neighbour in 4B. She signed for it.", at: "today" },
  { title: "Dinner", body: "Saturday 7 — bring a red.", at: "yesterday" },
]

/** Quick settings, page one and two, in the phone's order. */
export function tiles() {
  return [
    { id: "wifi", label: "Wi-Fi", icon: "wifi", on: true, detail: "Connected" },
    { id: "bluetooth", label: "Bluetooth", icon: "bluetooth", on: true, detail: "On" },
    { id: "dnd", label: "Do not disturb", icon: "moon", on: false, detail: "Off" },
    { id: "torch", label: "Torch", icon: "torch", on: false, detail: "Off" },
    { id: "mobile", label: "Mobile data", icon: "signal", on: false, detail: "No modem", disabled: true },
    { id: "rotation", label: "Rotation lock", icon: "rotate", on: true, detail: "Locked" },
    { id: "airplane", label: "Airplane mode", icon: "plane", on: false, detail: "Off" },
    { id: "location", label: "Location", icon: "map-pin", on: true, detail: "On" },
    { id: "night", label: "Night light", icon: "brightness", on: false, detail: "Off" },
    { id: "screensaver", label: "Screensaver", icon: "lock", on: false, detail: "Lock after 1 min" },
    { id: "dictation", label: "Dictation", icon: "mic", on: false, detail: "Voxtype" },
    { id: "theme", label: "Theme", icon: "sliders", on: false, detail: "Change the look", action: "theme" },
  ]
}
