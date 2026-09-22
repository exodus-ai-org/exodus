import type { WeatherResult } from '@exodus/shared/types/weather'
import { useTranslation } from 'react-i18next'

import { ROW_ENTER } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { conditionOf, weekdayLabel } from './shared'

/**
 * Ledger — axis: density. Shaped like the terminal card beside it: a header
 * line (the condition icon, the temperature, condition and place on the
 * left; the three forecast days as tiny columns on the right) over a body
 * line (the six readings as a hairline ledger, full width). Nothing to
 * expand, nothing to click; it reads in one glance and sits in the
 * transcript like a line of output.
 */
export function WeatherLedger({ data }: { data: WeatherResult }) {
  const { t } = useTranslation('chat')
  const { current, forecast, location } = data
  const { Icon, tint } = conditionOf(current.weatherCode)

  const readings: Array<[string, string]> = [
    [t('weatherCard.humidity'), `${current.humidity}%`],
    [t('weatherCard.wind'), `${current.windKmph} km/h ${current.windDir}`],
    [t('weatherCard.precip'), `${current.precipMM} mm`],
    [t('weatherCard.uvIndex'), current.uvIndex],
    [t('weatherCard.visibility'), `${current.visibility} km`],
    [t('weatherCard.pressure'), `${current.pressure} hPa`]
  ]

  return (
    <div
      className={cn(
        ROW_ENTER,
        'bg-card border-border w-full overflow-hidden rounded-lg border text-sm'
      )}
    >
      {/* header line: now on the left, the forecast columns on the right */}
      <div className="flex items-stretch justify-between">
        <div className="flex min-w-0 items-center gap-3 px-3.5 py-3">
          <Icon className={cn('size-7 shrink-0', tint)} strokeWidth={1.75} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-foreground text-2xl leading-none font-medium tracking-tight tabular-nums">
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
        </div>

        <div className="border-border divide-border/70 flex shrink-0 items-stretch divide-x border-l">
          {forecast.map((day, i) => {
            const c = conditionOf(day.weatherCode)
            return (
              <div
                key={day.date}
                className="flex w-16 flex-col items-center justify-center gap-1 py-2"
              >
                <span className="text-muted-foreground text-[10px] leading-none uppercase">
                  {weekdayLabel(day.date, i)}
                </span>
                <c.Icon className={cn('size-4', c.tint)} strokeWidth={1.75} />
                <span className="text-foreground text-[11px] leading-none tabular-nums">
                  {day.maxTempC}°
                  <span className="text-muted-foreground">
                    /{day.minTempC}°
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* body line: the readings ledger */}
      <dl className="border-border divide-border/70 grid grid-cols-6 divide-x border-t">
        {readings.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-1 px-3 py-2">
            <dt className="text-muted-foreground truncate text-[10px] leading-none tracking-wide uppercase">
              {label}
            </dt>
            <dd className="text-foreground truncate text-xs leading-none font-medium tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
