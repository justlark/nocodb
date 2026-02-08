// Temporary diagnostic plugin: tracks setTimeout call frequency to identify tight loops.
// Remove this file after debugging is complete.
export default defineNuxtPlugin(() => {
  console.warn('[debug] setTimeout diagnostic plugin loaded')
  const orig = window.setTimeout
  let count = 0
  let last = performance.now()

  window.setTimeout = function (fn: TimerHandler, delay?: number, ...args: any[]) {
    count++
    const now = performance.now()
    if (now - last >= 1000) {
      if (count > 100) {
        console.warn(`[debug] ${count} setTimeout calls in last ${Math.round(now - last)}ms`)
      }
      count = 0
      last = now
    }
    return orig.call(this, fn, delay, ...args) as unknown as ReturnType<typeof setTimeout>
  } as typeof setTimeout
})
