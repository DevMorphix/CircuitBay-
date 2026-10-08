import { useState } from 'react'
import { transform, useTransform } from 'framer-motion'

// Maps a scroll-progress motion value through keyframes, computed in JS.
// (Giving useTransform the arrays directly lets Framer hand the animation to
// the browser's native ScrollTimeline, whose range doesn't exactly match
// the JS progress — things were left half-faded at scroll checkpoints.)
export function useProgressMap(progress, input, output) {
  const [map] = useState(() => transform(input, output))
  return useTransform(progress, (p) => map(p))
}
