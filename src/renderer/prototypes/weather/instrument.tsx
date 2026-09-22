import type {
  WeatherForecastDay,
  WeatherResult
} from '@exodus/shared/types/weather'
import { Sunrise, Sunset } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ROW_ENTER } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { conditionOf, hourLabel, weekdayLabel } from './shared'

/**
 * Instrument — axis: interaction. The day is a temperature curve from the
 * eight hourly slots: it draws in once on entrance (explanation, not
 * decoration), the pointer scrubs it (time · temperature · rain chance,
 * no animation — it follows the hand), and the forecast days are a
 * segmented control that swaps the curve with a short crossfade. Sunrise
 * and sunset sit as ticks under the curve. For "how does the day go".
 */

const W = 320
const H = 88
const PAD_X = 8
const PAD_Y = 12

function curve(day: WeatherForecastDay) {
  const temps = day.hourly.map((h) => Number(h.tempC))
  const lo = Math.min(...temps)
  const hi = Math.max(...temps)
  const span = Math.max(1, hi - lo)
  const pts = temps.map((tc, i) => ({
    x: PAD_X + (i / (temps.length - 1)) * (W - PAD_X * 2),
    y: PAD_Y + (1 - (tc - lo) / span) * (H - PAD_Y * 2),
    tc,
    hour: day.hourly[i]
  }))
  // A soft monotone-ish curve through the points (Catmull-Rom → Bézier).
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return { d, pts, lo, hi }
}

/** "06:52 AM" → x position across the day. */
function timeToX(clock: string): number {
  const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(clock)
  if (!m) return PAD_X
  let h = Number(m[1]) % 12
  if (m[3].toUpperCase() === 'PM') h += 12
  const frac = (h + Number(m[2]) / 60) / 24
  // The eight slots run 0:00 → 21:00; map 24h onto that width.
  return PAD_X + frac * (24 / 21) * (W - PAD_X * 2)
}

export function WeatherInstrument({ data }: { data: WeatherResult }) {
  const { t } = useTranslation('chat')
  const { current, forecast, location } = data
  const { Icon, tint } = conditionOf(current.weatherCode)
  const [dayIndex, setDayIndex] = useState(0)
  const day = forecast[dayIndex]
  const { d, pts } = useMemo(() => curve(day), [day])
  const [hover, setHover] = useState<number | null>(null)
  const gradId = useId()

  // Draw-in: the path's dash offset transitions from its length to 0 once
  // per mount / day swap. Measured, not guessed.
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

  const active = hover === null ? null : pts[hover]

  return (
    <div
      className={cn(
        ROW_ENTER,
        'bg-card border-border w-full max-w-sm overflow-hidden rounded-lg border'
      )}
    >
      {/* now */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Icon className={cn('size-8 shrink-0', tint)} strokeWidth={1.5} />
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
        {/* the scrub readout lives where the eye already is */}
        <div className="text-right text-xs tabular-nums" aria-live="polite">
          {active ? (
            <>
              <div className="text-foreground font-medium">
                {active.tc}°
                <span className="text-muted-foreground ml-1.5">
                  {hourLabel(active.hour.time)}
                </span>
              </div>
              <div className="text-muted-foreground">
                {t('weatherCard.rainChance', {
                  percent: active.hour.rainChance
                })}
              </div>
            </>
          ) : (
            <>
              <div className="text-foreground font-medium">
                {day.maxTempC}°
                <span className="text-muted-foreground">/{day.minTempC}°</span>
              </div>
              <div className="text-muted-foreground">{day.condition}</div>
            </>
          )}
        </div>
      </div>

      {/* the curve */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-none select-none"
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
              so the tint lives here */}
          <linearGradient
            id={gradId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
            className={tint}
          >
            <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* sunrise / sunset ticks */}
        {[day.sunrise, day.sunset].map((clock, i) => (
          <line
            key={i}
            x1={timeToX(clock)}
            x2={timeToX(clock)}
            y1={H - 6}
            y2={H}
            className="stroke-border"
            strokeWidth={1}
          />
        ))}
        {/* area under the curve: the accent, faint (this is the one place
            the condition's colour touches a surface — at 14%, as a wash) */}
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
      <div className="text-muted-foreground flex items-center justify-between px-4 pb-3 text-[10px] tabular-nums">
        <span className="flex items-center gap-1">
          <Sunrise className="size-3" /> {day.sunrise}
        </span>
        <span className="flex items-center gap-1">
          <Sunset className="size-3" /> {day.sunset}
        </span>
      </div>

      {/* day control */}
      <div
        role="tablist"
        className="border-border bg-muted/40 flex border-t p-1"
      >
        {forecast.map((f, i) => {
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
                'flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs transition-[background-color,color,box-shadow] duration-150 ease-out active:scale-[0.98]',
                selected
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{weekdayLabel(f.date, i)}</span>
              <c.Icon className={cn('size-3.5', c.tint)} strokeWidth={1.75} />
              <span className="tabular-nums">
                {f.maxTempC}°<span className="opacity-60">/{f.minTempC}°</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
