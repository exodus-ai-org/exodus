import { type RefObject, useLayoutEffect, useState } from 'react'

/**
 * Whether the element is at least `min` pixels wide, kept current as it is
 * resized. Measured in a layout effect, so the first paint already has the
 * answer; until there is an element to measure it reads as wide.
 *
 * For a layout that changes what is mounted (two columns or tabs) — a
 * container query can only restyle what is there.
 */
export function useMinWidth(
  ref: RefObject<HTMLElement | null>,
  min: number
): boolean {
  const [wide, setWide] = useState(true)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setWide(element.getBoundingClientRect().width >= min)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, min])

  return wide
}
