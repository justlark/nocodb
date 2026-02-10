// Temporary diagnostic plugin: tracks setTimeout call frequency and captures
// stack traces of the top callers to identify the source of tight loops.
// Remove this file after debugging is complete.
export default defineNuxtPlugin(() => {
  console.warn('[debug] setTimeout diagnostic plugin loaded')
  const orig = window.setTimeout

  let count = 0
  let last = performance.now()
  const stacks = new Map<string, number>()

  window.setTimeout = function (fn: TimerHandler, delay?: number, ...args: any[]) {
    count++

    // Capture a short stack trace (cheap: only when count is climbing fast)
    if (count < 500 || count % 100 === 0) {
      const key = new Error().stack?.split('\n').slice(1, 5).join(' | ') ?? 'unknown'
      stacks.set(key, (stacks.get(key) ?? 0) + 1)
    }

    const now = performance.now()
    if (now - last >= 1000) {
      if (count > 100) {
        console.warn(`[debug] ${count} setTimeout calls in last ${Math.round(now - last)}ms`)
        // Log the top 5 callers by frequency
        const sorted = [...stacks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
        for (const [stack, n] of sorted) {
          console.warn(`[debug]   ${n} calls from:\n${stack}`)
        }
      }
      count = 0
      last = now
      stacks.clear()
    }

    return orig.call(this, fn, delay, ...args) as unknown as ReturnType<typeof setTimeout>
  } as typeof setTimeout
})
