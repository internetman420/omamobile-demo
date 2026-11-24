// SPDX-License-Identifier: MIT
// Pointer gestures for a touch screen drawn in a browser: drags with axis
// locking, swipes with velocity, long presses, taps. Pointer Events only, so
// mouse, pen and finger all behave the same way.

const AXIS_LOCK = 10
const TAP_SLOP = 8

/** Attach a drag. Handlers get deltas in the phone's design pixels.
 *
 *  Moves and releases are tracked on window rather than on the element: a
 *  gesture must survive the DOM under the finger changing mid-drag (the shade
 *  appearing, the drawer sliding in) and touch's implicit pointer capture.
 *  Pointer capture is deliberately not used — it retargets events and its
 *  lostpointercapture would end the gesture early. */
export function attachDrag(el, handlers) {
  const { onStart, onMove, onEnd, onCancel, axis = "auto", scale = () => 1, preventDefault = true } = handlers
  let pointerId = null
  let startX = 0
  let startY = 0
  let locked = null
  let last = { x: 0, y: 0, t: 0, vx: 0, vy: 0 }

  // Positions are reported in the phone's own design pixels: page
  // coordinates minus the screen's origin, divided by the stage scale.
  const point = (event) => {
    const s = scale() || 1
    const screen = document.getElementById("screen")
    const rect = screen ? screen.getBoundingClientRect() : { left: 0, top: 0 }
    return { x: (event.clientX - rect.left) / s, y: (event.clientY - rect.top) / s }
  }

  function down(event) {
    if (pointerId !== null) return
    if (event.pointerType === "mouse" && event.button !== 0) return
    pointerId = event.pointerId
    const p = point(event)
    startX = p.x
    startY = p.y
    last = { x: p.x, y: p.y, t: performance.now(), vx: 0, vy: 0 }
    locked = axis === "auto" ? null : axis
    window.addEventListener("pointermove", move, { passive: false })
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", cancel)
    onStart?.({ x: p.x, y: p.y, event })
  }

  function move(event) {
    if (event.pointerId !== pointerId) return
    const p = point(event)
    const dx = p.x - startX
    const dy = p.y - startY
    if (locked === null) {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return
      locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
    }
    const now = performance.now()
    const dt = Math.max(1, now - last.t)
    last.vx = ((p.x - last.x) / dt) * 1000
    last.vy = ((p.y - last.y) / dt) * 1000
    last.x = p.x
    last.y = p.y
    last.t = now
    if (preventDefault) event.preventDefault()
    onMove?.({ dx: locked === "x" ? dx : 0, dy: locked === "y" ? dy : 0, rawDx: dx, rawDy: dy, axis: locked, event })
  }

  function release() {
    window.removeEventListener("pointermove", move)
    window.removeEventListener("pointerup", up)
    window.removeEventListener("pointercancel", cancel)
  }

  function up(event) {
    if (event.pointerId !== pointerId) return
    const p = point(event)
    const dx = p.x - startX
    const dy = p.y - startY
    const axisUsed = locked
    const tap = Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP
    pointerId = null
    locked = null
    release()
    onEnd?.({
      dx: axisUsed === "x" ? dx : axisUsed === "y" ? dy : 0,
      dy: axisUsed === "y" ? dy : 0,
      rawDx: dx,
      rawDy: dy,
      axis: axisUsed,
      tap,
      vx: last.vx,
      vy: last.vy,
      event,
    })
  }

  function cancel(event) {
    if (event.pointerId !== pointerId) return
    pointerId = null
    locked = null
    release()
    onCancel?.()
  }

  el.addEventListener("pointerdown", down)

  return () => {
    el.removeEventListener("pointerdown", down)
    release()
  }
}

/** Long press that does not fire after a drag. */
export function attachLongPress(el, onLongPress, { ms = 480, onRelease, onMove } = {}) {
  let timer = 0
  let start = null
  let fired = false
  const stop = () => {
    clearTimeout(timer)
    timer = 0
  }
  el.addEventListener("pointerdown", (event) => {
    start = { x: event.clientX, y: event.clientY }
    fired = false
    stop()
    timer = setTimeout(() => {
      fired = true
      navigator.vibrate?.(12)
      onLongPress?.(event)
    }, ms)
  })
  el.addEventListener("pointermove", (event) => {
    if (!start) return
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    onMove?.(moved, event)
    if (moved > AXIS_LOCK) stop()
  })
  const end = (event) => {
    stop()
    if (!fired) onRelease?.(event)
    start = null
  }
  el.addEventListener("pointerup", end)
  el.addEventListener("pointercancel", end)
  el.addEventListener("pointerleave", () => {
    stop()
  })
  return stop
}
