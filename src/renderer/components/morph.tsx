import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode
} from 'react'

import { cn } from '@/lib/utils'

/**
 * In-place state changes for a card that opens where it stands. Both are
 * height transitions — the one case CLAUDE.md's Motion section allows one
 * for: the thing is growing in place, and a jump would shove everything
 * under it. 250 ms on `ease-out`; reduced motion snaps them (globals.css
 * keeps only opacity/colour).
 */

/**
 * Two states in one cell. The height follows whichever is active
 * (measured, so `auto` never enters the transition), the outgoing one
 * fades under a 2px blur so the two never read as two objects, and the
 * hidden one is `inert`.
 */
export function Morph({
  active,
  children
}: {
  active: 0 | 1
  children: [ReactNode, ReactNode]
}) {
  const first = useRef<HTMLDivElement>(null)
  const second = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  useLayoutEffect(() => {
    const el = (active === 0 ? first : second).current
    if (!el) return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [active])
  return (
    <div
      className="grid items-start overflow-hidden transition-[height] duration-250 ease-out"
      style={{ height }}
    >
      {children.map((child, i) => (
        <div
          key={i}
          ref={i === 0 ? first : second}
          inert={i !== active}
          data-active={i === active || undefined}
          className={cn(
            'col-start-1 row-start-1 w-full transition-[opacity,filter] duration-200 ease-out',
            i === active ? 'opacity-100' : 'opacity-0 blur-[2px]'
          )}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

/**
 * A section growing from nothing: `grid-template-rows` 0fr → 1fr. This outer
 * div is the one whose own layout box truly goes to 0×0 (the CSS grid track
 * collapses, and `min-h-0 overflow-hidden` on the inner one lets it shrink
 * below its content's size) — it is genuinely gone, not just painted
 * transparent. The children do NOT shrink themselves; they are only clipped
 * by the ancestor's `overflow: hidden`, so their own bounding box stays at
 * full size even while closed. A test asserting visible/hidden (Playwright's
 * `toBeVisible()` checks only the target's own box, never an ancestor's
 * clipping) must target *this* element — pass `data-testid` here, never on
 * the content — or it will see the clipped content as "visible" throughout.
 */
export function Reveal({
  open,
  children,
  className,
  ...rest
}: {
  open: boolean
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>) {
  return (
    <div
      {...rest}
      inert={!open}
      data-open={open || undefined}
      className={cn(
        'grid transition-[grid-template-rows] duration-250 ease-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className
      )}
    >
      <div
        className={cn(
          'min-h-0 overflow-hidden transition-opacity duration-200 ease-out',
          open ? 'opacity-100' : 'opacity-0'
        )}
      >
        {children}
      </div>
    </div>
  )
}
