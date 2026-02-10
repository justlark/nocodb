// Temporary diagnostic plugin: detects setTimeout storms and samples stack traces.
// Remove this file after debugging is complete.
export default defineNuxtPlugin(() => {
  console.warn('[debug] setTimeout diagnostic plugin loaded')
  const orig = window.setTimeout

  let count = 0
  let last = performance.now()
  let stormDetected = false
  let samples: string[] = []

  window.setTimeout = function (fn: TimerHandler, delay?: number, ...args: any[]) {
    count++

    // Once a storm is detected, grab a few stack samples then stop intercepting
    if (stormDetected && samples.length < 10) {
      samples.push(new Error().stack ?? 'no stack')
    }

    const now = performance.now()
    if (now - last >= 200) {
      if (count > 200 && !stormDetected) {
        // Storm detected — flag it so we sample stacks on next calls
        stormDetected = true
        console.warn(`[debug] storm detected: ${count} setTimeout calls in ${Math.round(now - last)}ms — sampling stacks...`)
      }

      if (stormDetected && samples.length >= 10) {
        // We have enough samples — dump them and restore original setTimeout
        console.warn('[debug] stack samples collected:')
        for (const s of samples) {
          console.warn(s)
        }
        // Restore original to stop overhead
        window.setTimeout = orig
      }

      count = 0
      last = now
    }

    return orig.call(this, fn, delay, ...args) as unknown as ReturnType<typeof setTimeout>
  } as typeof setTimeout
})
