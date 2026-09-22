import type {
  WeatherForecastDay,
  WeatherResult
} from '@exodus/shared/types/weather'
import { ChevronDown, Sunrise, Sunset } from 'lucide-react'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { useTranslation } from 'react-i18next'

import { ROW_ENTER, staggerDelay } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { conditionOf, hourLabel, weekdayLabel } from './shared'

/**
 * Expanding — Instrument by default, Composite on "Details". The curve is
 * the constant: the compact header above it swaps for the headline, the
 * readings and the curve's caption grow in above it, and the segmented
 * three days under it swap for the week's range-bar rows. Everything moves
 * on one 250 ms ease-out so it reads as one card opening, not four things
 * happening. The curve draws on the day's own range with a 6° floor; the
 * bars share one scale.
 */

const W = 400
const H = 88
const PAD_X = 18 // the text column's inset, so the curve's ends align with it
const PAD_Y = 12
const MIN_SPAN = 6

function curve(day: WeatherForecastDay) {
  const temps = day.hourly.map((h) => Number(h.tempC))
  const lo = Math.min(...temps)
  const hi = Math.max(...temps)
  const span = Math.max(MIN_SPAN, hi - lo)
  // A day narrower than the floor sits in the middle of its band.
  const base = lo - (span - (hi - lo)) / 2
  const pts = temps.map((tc, i) => ({
    x: PAD_X + (i / (temps.length - 1)) * (W - PAD_X * 2),
    y: PAD_Y + (1 - (tc - base) / span) * (H - PAD_Y * 2),
    tc,
    hour: day.hourly[i]
  }))
  // Catmull-Rom → cubic Bézier: a soft curve through every slot.
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${
      p2.x - (p3.x - p1.x) / 6
    } ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`
  }
  return { d, pts }
}

/** "06:52 AM" → x across the day (the eight slots run 0:00 → 21:00). */
function timeToX(clock: string): number {
  const m = /(\d+):(\d+)\s*(AM|PM)/iu.exec(clock)
  if (!m) return PAD_X
  let h = Number(m[1]) % 12
  if (m[3].toUpperCase() === 'PM') h += 12
  return PAD_X + ((h + Number(m[2]) / 60) / 21) * (W - PAD_X * 2)
}

/**
 * Two states in one cell. The height follows whichever is active (measured
 * — the one place a height transition is right: the card is opening in
 * place, and a jump here would shove the transcript), the inactive one
 * fades under a 2px blur so the two never read as two objects.
 */
function Morph({
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

/** A section growing from nothing — `grid-template-rows` 0fr → 1fr, for
 *  the same reason as Morph's height. */
function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      className={cn(
        'grid transition-[grid-template-rows] duration-250 ease-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
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

export function WeatherExpanding({ data }: { data: WeatherResult }) {
  const { t } = useTranslation('chat')
  const { current, forecast, location } = data
  const now = conditionOf(current.weatherCode)
  const [expanded, setExpanded] = useState(false)
  const [dayIndex, setDayIndex] = useState(0)
  const day = forecast[dayIndex]
  const gradId = useId()

  const readings: Array<[string, string]> = [
    [t('weatherCard.humidity'), `${current.humidity}%`],
    [t('weatherCard.wind'), `${current.windKmph} km/h ${current.windDir}`],
    [t('weatherCard.precip'), `${current.precipMM} mm`],
    [t('weatherCard.uvIndex'), current.uvIndex],
    [t('weatherCard.visibility'), `${current.visibility} km`],
    [t('weatherCard.pressure'), `${current.pressure} hPa`]
  ]

  // The bars' scale: every day's hi/lo in the forecast.
  const scale = useMemo(() => {
    const lo = Math.min(...forecast.map((f) => Number(f.minTempC)))
    const hi = Math.max(...forecast.map((f) => Number(f.maxTempC)))
    return { lo, span: Math.max(1, hi - lo) }
  }, [forecast])
  const { d, pts } = useMemo(() => curve(day), [day])

  // Draw-in: dash offset from the measured length to 0, once per curve.
  const pathRef = useRef<SVGPathElement>(null)
  const [length, setLength] = useState(0)
  useEffect(() => {
    setLength(pathRef.current?.getTotalLength() ?? 0)
  }, [d])
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    setDrawn(false)
    const f = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(f)
  }, [d])

  const [hover, setHover] = useState<number | null>(null)
  const active = hover === null ? null : pts[hover]

  // The selected day's numbers: hi/lo, or the scrub readout. Two lines in
  // the compact header's right, one line above the curve when open.
  const value = active ? (
    <span className="text-foreground font-medium">
      {active.tc}°
      <span className="text-muted-foreground ml-1.5 font-normal">
        {hourLabel(active.hour.time)}
      </span>
    </span>
  ) : (
    <span className="text-foreground font-medium">
      {day.maxTempC}°
      <span className="text-muted-foreground font-normal">
        /{day.minTempC}°
      </span>
    </span>
  )
  const detail = active
    ? t('weatherCard.rainChance', { percent: active.hour.rainChance })
    : day.condition

  // The compact view shows what a segmented control can hold; the week
  // waits behind Details.
  const compactDays = forecast.slice(0, 3)

  return (
    <div
      className={cn(
        ROW_ENTER,
        // The open card is a step wider (the curve breathes, seven rows do
        // not crowd); the width moves with the height so it opens as one.
        'bg-card border-border w-full overflow-hidden rounded-lg border transition-[max-width] duration-250 ease-out',
        expanded ? 'max-w-md' : 'max-w-sm'
      )}
    >
      <Morph active={expanded ? 1 : 0}>
        {/* compact: Instrument's header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <now.Icon
            className={cn('size-8 shrink-0', now.tint)}
            strokeWidth={1.5}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-foreground text-3xl leading-none font-medium tracking-tight tabular-nums">
                {current.tempC}°
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {t('weatherCard.feelsLike', { temp: current.feelsLikeC })}
              </span>
            </div>
            <div className="text-muted-foreground mt-1 truncate text-xs">
              {current.condition}
              <span className="mx-1.5 opacity-40">·</span>
              {location}
            </div>
          </div>
          <div
            className="flex flex-col items-end text-xs tabular-nums"
            aria-live="polite"
          >
            <div>{value}</div>
            <div className="text-muted-foreground">{detail}</div>
          </div>
        </div>

        {/* open: Editorial's headline */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
          <div>
            <div className="flex items-start">
              <span className="text-foreground text-6xl leading-none font-light tracking-tighter tabular-nums">
                {current.tempC}
              </span>
              <span className="text-muted-foreground mt-1 text-2xl leading-none font-light">
                °
              </span>
            </div>
            <p className="text-foreground mt-3 text-sm font-medium">
              {current.condition}
              <span className="text-muted-foreground font-normal">
                <span className="mx-1.5 opacity-40">·</span>
                {location}
              </span>
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
              {t('weatherCard.feelsLike', { temp: current.feelsLikeC })}
              <span className="mx-1.5 opacity-40">·</span>
              {t('weatherCard.observedAt', { time: current.observedAt })}
            </p>
          </div>
          <now.Icon
            className={cn('mt-1 size-9 shrink-0', now.tint)}
            strokeWidth={1.5}
          />
        </div>
      </Morph>

      {/* open: the readings */}
      <Reveal open={expanded}>
        <dl className="border-border grid grid-cols-3 gap-x-4 gap-y-3 border-t px-5 py-4">
          {readings.map(([label, reading], i) => (
            <div key={label} className={ROW_ENTER} style={staggerDelay(i)}>
              <dt className="text-muted-foreground text-[11px] leading-none">
                {label}
              </dt>
              <dd className="text-foreground mt-1.5 text-sm leading-none font-medium tabular-nums">
                {reading}
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* open: the curve's caption (the compact header carried it) */}
      <Reveal open={expanded}>
        <div
          className="border-border flex items-baseline justify-between border-t px-5 pt-3 text-xs tabular-nums"
          aria-live="polite"
        >
          <span className="text-foreground font-medium">
            {weekdayLabel(day.date, dayIndex)}
            <span className="text-muted-foreground font-normal">
              <span className="mx-1.5 opacity-40">·</span>
              {day.condition}
            </span>
          </span>
          <span>
            {value}
            <span className="text-muted-foreground">
              <span className="mx-1.5 opacity-40">·</span>
              {detail}
            </span>
          </span>
        </div>
      </Reveal>

      {/* the curve — the constant */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 block w-full touch-none select-none"
        style={{ height: H }}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = ((e.clientX - rect.left) / rect.width) * W
          const i = Math.round(
            ((x - PAD_X) / (W - PAD_X * 2)) * (pts.length - 1)
          )
          setHover(Math.max(0, Math.min(pts.length - 1, i)))
        }}
      >
        <defs>
          {/* `currentColor` on a stop resolves from the gradient's own
              inheritance chain, not from the path that paints with it —
              so the day's tint lives here */}
          <linearGradient
            id={gradId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
            className={conditionOf(day.weatherCode).tint}
          >
            <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[day.sunrise, day.sunset].map((clock, i) => (
          <line
            key={i}
            x1={timeToX(clock)}
            x2={timeToX(clock)}
            y1={H - 6}
            y2={H}
            className="stroke-muted-foreground/50"
            strokeWidth={1}
          />
        ))}
        <path
          d={`${d} L ${pts.at(-1)!.x} ${H} L ${pts[0].x} ${H} Z`}
          fill={`url(#${gradId})`}
          className="transition-opacity duration-300 ease-out"
          style={{ opacity: drawn ? 1 : 0 }}
        />
        <path
          ref={pathRef}
          d={d}
          fill="none"
          className="stroke-foreground"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray={length || undefined}
          strokeDashoffset={drawn ? 0 : length}
          style={{
            transition: length
              ? 'stroke-dashoffset 300ms var(--ease-out)'
              : undefined
          }}
        />
        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={PAD_Y - 6}
              y2={H - 8}
              className="stroke-border"
              strokeWidth={1}
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={3.5}
              className="fill-card stroke-foreground"
              strokeWidth={1.5}
            />
          </>
        )}
      </svg>
      <div className="text-muted-foreground flex items-center justify-between px-5 pb-2 text-[10px] tabular-nums">
        <span className="flex items-center gap-1">
          <Sunrise className="size-3" /> {day.sunrise}
        </span>
        <span className="flex items-center gap-1">
          <Sunset className="size-3" /> {day.sunset}
        </span>
      </div>

      <Morph active={expanded ? 1 : 0}>
        {/* compact: the segmented days */}
        <div
          role="tablist"
          className="border-border bg-muted/40 flex border-t p-1"
        >
          {compactDays.map((f, i) => {
            const c = conditionOf(f.weatherCode)
            const selected = i === dayIndex
            return (
              <button
                key={f.date}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setDayIndex(i)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
                  selected
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{weekdayLabel(f.date, i)}</span>
                <c.Icon className={cn('size-3.5', c.tint)} strokeWidth={1.75} />
                <span className="tabular-nums">
                  {f.maxTempC}°
                  <span className="opacity-60">/{f.minTempC}°</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* open: the week as range bars, and the selector */}
        <div className="border-border border-t px-3 py-2">
          {forecast.map((f, i) => {
            const c = conditionOf(f.weatherCode)
            const lo = Number(f.minTempC)
            const hi = Number(f.maxTempC)
            const left = ((lo - scale.lo) / scale.span) * 100
            const width = ((hi - lo) / scale.span) * 100
            const selected = i === dayIndex
            return (
              <button
                key={f.date}
                type="button"
                aria-pressed={selected}
                onClick={() => setDayIndex(i)}
                className={cn(
                  'grid w-full grid-cols-[3rem_1.25rem_2.25rem_1fr_2.25rem] items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                  'transition-[background-color,transform] duration-150 ease-out active:scale-[0.99]',
                  selected ? 'bg-muted' : 'hover:bg-muted/50'
                )}
              >
                <span className="text-foreground">
                  {weekdayLabel(f.date, i)}
                </span>
                <c.Icon className={cn('size-4', c.tint)} strokeWidth={1.75} />
                <span className="text-muted-foreground text-right tabular-nums">
                  {lo}°
                </span>
                <span className="bg-muted-foreground/15 relative h-1 rounded-full">
                  <span
                    className="bg-foreground/60 absolute inset-y-0 rounded-full"
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 4)}%`
                    }}
                  />
                </span>
                <span className="text-foreground text-right font-medium tabular-nums">
                  {hi}°
                </span>
              </button>
            )
          })}
        </div>
      </Morph>

      {/* the toggle — last, in the same place in both states */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => {
          setExpanded((v) => !v)
          // The compact control holds three days; leaving the week on a
          // later one would select a tab that is not there.
          if (expanded && dayIndex >= compactDays.length) setDayIndex(0)
        }}
        className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full items-center justify-center gap-1 border-t py-1.5 text-xs transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.99]"
      >
        {expanded ? t('weatherCard.less') : t('weatherCard.details')}
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform duration-200 ease-out',
            expanded && 'rotate-180'
          )}
        />
      </button>
    </div>
  )
}
