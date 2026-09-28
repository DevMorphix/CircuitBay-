import { useEffect, useRef, useState } from 'react'

// Preloads a numbered image sequence (frame_001.webp … frame_0NN.webp) into a
// ref of decoded <img> elements. Frame 1 is awaited before `firstReady` flips
// true (it's what paints first); the rest stream in behind it — draw calls
// simply clamp to the highest index actually decoded, so a scrub that
// outruns the network never shows a blank frame, just a brief hold on the
// last-good one. Load progress beyond `firstReady` is tracked via the
// (non-reactive) `imagesRef` array itself rather than React state — nothing
// needs a render on every single frame arriving.
export function useFramePreloader(count, pathBuilder) {
  const imagesRef = useRef([])
  const [firstReady, setFirstReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const images = new Array(count)
    imagesRef.current = images

    const loadOne = (i) =>
      new Promise((resolve) => {
        const img = new Image()
        img.decoding = 'async'
        img.onload = () => {
          images[i] = img
          resolve()
        }
        img.onerror = resolve
        img.src = pathBuilder(i + 1)
      })

    ;(async () => {
      await loadOne(0)
      if (!cancelled) setFirstReady(true)
      for (let i = 1; i < count; i++) {
        if (cancelled) return
        await loadOne(i)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  return { imagesRef, firstReady }
}
