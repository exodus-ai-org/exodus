import { WeatherForecastDay, WWO_CODE } from '@shared/types/weather'
import { motion } from 'framer-motion'
import {
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  SunIcon
} from 'lucide-react'

function getWeatherIcon(code: string) {
  const type = WWO_CODE[code as keyof typeof WWO_CODE] ?? 'Cloudy'
  switch (type) {
    case 'Sunny':
      return <SunIcon className="h-4 w-4 text-yellow-400" />
    case 'PartlyCloudy':
      return <CloudSunIcon className="h-4 w-4 text-blue-400" />
    case 'Cloudy':
      return <CloudIcon className="h-4 w-4 text-slate-400" />
    case 'VeryCloudy':
      return <CloudIcon className="h-4 w-4 text-slate-600" />
    case 'Fog':
      return <CloudFogIcon className="h-4 w-4 text-slate-300" />
    case 'LightShowers':
      return <CloudDrizzleIcon className="h-4 w-4 text-blue-300" />
    case 'LightSleetShowers':
    case 'LightSleet':
      return <CloudSnowIcon className="h-4 w-4 text-blue-200" />
    case 'LightSnow':
    case 'LightSnowShowers':
      return <CloudSnowIcon className="h-4 w-4 text-slate-200" />
    case 'HeavySnow':
    case 'HeavySnowShowers':
      return <CloudSnowIcon className="h-4 w-4 text-white" />
    case 'ThunderyShowers':
    case 'ThunderyHeavyRain':
    case 'ThunderySnowShowers':
      return <CloudLightningIcon className="h-4 w-4 text-yellow-500" />
    case 'LightRain':
      return <CloudRainIcon className="h-4 w-4 text-blue-400" />
    case 'HeavyShowers':
    case 'HeavyRain':
      return <CloudRainIcon className="h-4 w-4 text-blue-600" />
    default:
      return <CloudIcon className="h-4 w-4 text-slate-400" />
  }
}

// "0" → "12 AM", "900" → "9 AM", "1500" → "3 PM"
function formatTime(time: string): string {
  const h = Math.floor(Number(time) / 100)
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

export function WeatherForecast({
  forecast
}: {
  forecast: WeatherForecastDay
}) {
  return (
    <div className="space-y-3 px-2 pt-3 pb-2">
      {/* ── min/max bar ── */}
      <div className="bg-muted/60 rounded-2xl px-3 py-2.5">
        <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs">
          <span>🌡️ Temperature range</span>
          <span className="text-foreground font-semibold">
            {forecast.minTempC}° – {forecast.maxTempC}°
          </span>
        </div>
        <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
          <motion.div
            className="absolute inset-y-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #38bdf8, #fb923c)',
              left: '0%',
              right: '0%'
            }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <div className="text-muted-foreground mt-2 flex justify-between text-[10px]">
          <span>❄️ Cold</span>
          <span>🔥 Hot</span>
        </div>
      </div>

      {/* ── sunrise / sunset ── */}
      <div className="flex gap-2">
        <div className="bg-muted/60 flex flex-1 items-center gap-2 rounded-2xl px-3 py-2">
          <span className="text-lg leading-none">🌅</span>
          <div>
            <p className="text-muted-foreground text-[10px]">Sunrise</p>
            <p className="text-xs font-semibold">{forecast.sunrise}</p>
          </div>
        </div>
        <div className="bg-muted/60 flex flex-1 items-center gap-2 rounded-2xl px-3 py-2">
          <span className="text-lg leading-none">🌇</span>
          <div>
            <p className="text-muted-foreground text-[10px]">Sunset</p>
            <p className="text-xs font-semibold">{forecast.sunset}</p>
          </div>
        </div>
      </div>

      {/* ── hourly scroll ── */}
      <div className="relative">
        <div className="no-scrollbar flex gap-2 overflow-x-scroll pb-1">
          {forecast.hourly.map((h, index) => {
            const rainPct = Number(h.rainChance)
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="bg-muted/60 flex min-w-[52px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2.5 py-2"
              >
                <span className="text-muted-foreground text-[10px] leading-none">
                  {formatTime(h.time)}
                </span>
                <div className="my-0.5">{getWeatherIcon(h.weatherCode)}</div>
                <span className="text-xs leading-none font-semibold">
                  {h.tempC}°
                </span>
                {rainPct > 0 ? (
                  <span className="text-[9px] leading-none font-medium text-blue-400">
                    💧{rainPct}%
                  </span>
                ) : (
                  <span className="text-muted-foreground/50 text-[9px] leading-none">
                    —
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
        <div className="from-card pointer-events-none absolute top-0 right-0 h-full w-10 bg-linear-to-l to-transparent" />
      </div>
    </div>
  )
}
