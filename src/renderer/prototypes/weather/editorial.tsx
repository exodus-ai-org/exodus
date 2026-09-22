import type { WeatherResult } from '@exodus/shared/types/weather'
import { useTranslation } from 'react-i18next'

import { ROW_ENTER, staggerDelay } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { conditionOf, weekdayLabel } from './shared'

/**
 * Editorial — axis: typographic weight. The temperature is the headline: a
 * 60px light numeral with the degree as a hanging mark, the condition and
 * place as its caption. The readings are a 2×3 grid under a hairline, label
 * over value. The forecast is a strip whose hi/lo sit on a range bar — each
 * day's span drawn within the three-day min/max, so the trend reads without
 * a chart. Generous; the weather is the answer here.
 */
export function WeatherEditorial({ data }: { data: WeatherResult }) {
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

  const lows = forecast.map((d) => Number(d.minTempC))
  const highs = forecast.map((d) => Number(d.maxTempC))
  const min = Math.min(...lows)
  const max = Math.max(...highs)
  const span = Math.max(1, max - min)

  return (
    <div
      className={cn(
        ROW_ENTER,
        'bg-card border-border w-full max-w-sm overflow-hidden rounded-lg border'
      )}
    >
      {/* headline */}
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
        <Icon className={cn('mt-1 size-9 shrink-0', tint)} strokeWidth={1.5} />
      </div>

      {/* readings */}
      <dl className="border-border grid grid-cols-3 gap-x-4 gap-y-3 border-t px-5 py-4">
        {readings.map(([label, value], i) => (
          <div key={label} className={ROW_ENTER} style={staggerDelay(i)}>
            <dt className="text-muted-foreground text-[11px] leading-none">
              {label}
            </dt>
            <dd className="text-foreground mt-1.5 text-sm leading-none font-medium tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {/* forecast with range bars */}
      <div className="border-border border-t px-5 py-3">
        {forecast.map((day, i) => {
          const c = conditionOf(day.weatherCode)
          const lo = Number(day.minTempC)
          const hi = Number(day.maxTempC)
          const left = ((lo - min) / span) * 100
          const width = ((hi - lo) / span) * 100
          return (
            <div
              key={day.date}
              className="grid grid-cols-[3rem_1.25rem_2.25rem_1fr_2.25rem] items-center gap-2 py-1.5 text-xs"
            >
              <span className="text-foreground">
                {weekdayLabel(day.date, i)}
              </span>
              <c.Icon className={cn('size-4', c.tint)} strokeWidth={1.75} />
              <span className="text-muted-foreground text-right tabular-nums">
                {lo}°
              </span>
              <span className="bg-muted relative h-1 rounded-full">
                <span
                  className={cn(
                    'absolute inset-y-0 rounded-full',
                    'bg-foreground/60'
                  )}
                  style={{ left: `${left}%`, width: `${Math.max(width, 6)}%` }}
                />
              </span>
              <span className="text-foreground text-right font-medium tabular-nums">
                {hi}°
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
