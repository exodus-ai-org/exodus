import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WeatherResult, WWO_CODE } from '@shared/types/weather'
import { motion } from 'framer-motion'
import { WeatherForecast } from './weather-forecast'

// ── per-weather-type config ───────────────────────────────────────────────────

const THEME: Record<
  string,
  { gradient: string; emoji: string; particles?: 'rain' | 'snow' }
> = {
  Sunny: {
    gradient: 'linear-gradient(135deg, #f59e0b, #fb923c, #38bdf8)',
    emoji: '☀️'
  },
  PartlyCloudy: {
    gradient: 'linear-gradient(135deg, #7dd3fc, #60a5fa, #818cf8)',
    emoji: '⛅'
  },
  Cloudy: {
    gradient: 'linear-gradient(135deg, #94a3b8, #64748b, #475569)',
    emoji: '☁️'
  },
  VeryCloudy: {
    gradient: 'linear-gradient(135deg, #64748b, #475569, #334155)',
    emoji: '☁️'
  },
  Fog: {
    gradient: 'linear-gradient(135deg, #cbd5e1, #94a3b8, #64748b)',
    emoji: '🌫️'
  },
  LightShowers: {
    gradient: 'linear-gradient(135deg, #7dd3fc, #3b82f6, #475569)',
    emoji: '🌦️',
    particles: 'rain'
  },
  LightSleetShowers: {
    gradient: 'linear-gradient(135deg, #bae6fd, #93c5fd, #6366f1)',
    emoji: '🌨️',
    particles: 'snow'
  },
  LightSleet: {
    gradient: 'linear-gradient(135deg, #bae6fd, #93c5fd, #6366f1)',
    emoji: '🌨️',
    particles: 'snow'
  },
  LightSnow: {
    gradient: 'linear-gradient(135deg, #e0f2fe, #bae6fd, #a5b4fc)',
    emoji: '🌨️',
    particles: 'snow'
  },
  LightSnowShowers: {
    gradient: 'linear-gradient(135deg, #e0f2fe, #bae6fd, #a5b4fc)',
    emoji: '❄️',
    particles: 'snow'
  },
  HeavySnow: {
    gradient: 'linear-gradient(135deg, #f1f5f9, #bae6fd, #a5b4fc)',
    emoji: '❄️',
    particles: 'snow'
  },
  HeavySnowShowers: {
    gradient: 'linear-gradient(135deg, #f1f5f9, #bae6fd, #a5b4fc)',
    emoji: '❄️',
    particles: 'snow'
  },
  ThunderyShowers: {
    gradient: 'linear-gradient(135deg, #475569, #334155, #1e293b)',
    emoji: '⛈️',
    particles: 'rain'
  },
  ThunderyHeavyRain: {
    gradient: 'linear-gradient(135deg, #334155, #1e293b, #0f172a)',
    emoji: '⛈️',
    particles: 'rain'
  },
  ThunderySnowShowers: {
    gradient: 'linear-gradient(135deg, #475569, #334155, #312e81)',
    emoji: '🌨️',
    particles: 'snow'
  },
  LightRain: {
    gradient: 'linear-gradient(135deg, #60a5fa, #2563eb, #475569)',
    emoji: '🌧️',
    particles: 'rain'
  },
  HeavyShowers: {
    gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8, #334155)',
    emoji: '🌧️',
    particles: 'rain'
  },
  HeavyRain: {
    gradient: 'linear-gradient(135deg, #1d4ed8, #1e40af, #1e293b)',
    emoji: '⛈️',
    particles: 'rain'
  }
}

const DEFAULT_THEME = {
  gradient: 'linear-gradient(135deg, #64748b, #475569, #334155)',
  emoji: '☁️'
}

// ── particle overlays ─────────────────────────────────────────────────────────

const RAIN_DROPS = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 4.2) % 100}%`,
  delay: (i * 0.13) % 1.2,
  duration: 0.6 + (i % 4) * 0.15
}))

const SNOW_FLAKES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 5.6) % 100}%`,
  delay: (i * 0.2) % 2,
  size: i % 3 === 0 ? 6 : i % 3 === 1 ? 5 : 4
}))

function RainOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {RAIN_DROPS.map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/40"
          style={{ left: d.left, top: '-8%', width: 1.5, height: 14 }}
          animate={{ y: ['0%', '120%'], opacity: [0.6, 0] }}
          transition={{
            duration: d.duration,
            repeat: Infinity,
            delay: d.delay,
            ease: 'linear'
          }}
        />
      ))}
    </div>
  )
}

function SnowOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {SNOW_FLAKES.map((f, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/70"
          style={{ left: f.left, top: '-5%', width: f.size, height: f.size }}
          animate={{
            y: ['0%', '110%'],
            x: [0, 12, -8, 6, 0],
            opacity: [0.8, 0]
          }}
          transition={{
            duration: 3 + (i % 3),
            repeat: Infinity,
            delay: f.delay,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  )
}

// ── stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  emoji,
  value,
  label
}: {
  emoji: string
  value: string
  label: string
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-sm leading-tight font-semibold text-white">
        {value}
      </span>
      <span className="text-[10px] leading-none text-white/60">{label}</span>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

function formatTabLabel(dateStr: string, i: number) {
  if (i === 0) return 'Today'
  if (i === 1) return 'Tmr'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en', { weekday: 'short' })
}

export function WeatherCard({ toolResult }: { toolResult: WeatherResult }) {
  const { location, current, forecast } = toolResult
  const weatherType =
    WWO_CODE[current.weatherCode as keyof typeof WWO_CODE] ?? 'Cloudy'
  const theme = THEME[weatherType] ?? DEFAULT_THEME

  return (
    <div className="w-full max-w-xs overflow-hidden rounded-3xl shadow-2xl">
      {/* ── hero ── */}
      <div className="relative" style={{ background: theme.gradient }}>
        {theme.particles === 'rain' && <RainOverlay />}
        {theme.particles === 'snow' && <SnowOverlay />}

        <div className="relative px-5 pt-5 pb-5 text-white">
          {/* location */}
          <p className="mb-4 flex items-center gap-1 text-xs font-medium text-white/70">
            <span>📍</span>
            {location}
          </p>

          {/* temp + icon */}
          <div className="flex items-end justify-between">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-7xl leading-none font-thin tracking-tighter">
                {current.tempC}°
              </p>
              <p className="mt-2 text-base font-light text-white/90">
                {current.condition}
              </p>
              <p className="mt-0.5 text-xs text-white/55">
                Feels {current.feelsLikeC}° · {current.observedAt}
              </p>
            </motion.div>

            <motion.span
              className="text-6xl leading-none select-none"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {theme.emoji}
            </motion.span>
          </div>

          {/* stats grid */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <StatPill
              emoji="💧"
              value={`${current.humidity}%`}
              label="Humidity"
            />
            <StatPill
              emoji="💨"
              value={`${current.windKmph} km/h`}
              label={`${current.windDir}`}
            />
            <StatPill
              emoji="☔"
              value={`${current.precipMM}mm`}
              label="Precip"
            />
            <StatPill
              emoji="👁"
              value={`${current.visibility} km`}
              label="Visibility"
            />
            <StatPill emoji="🔆" value={current.uvIndex} label="UV Index" />
            <StatPill emoji="📊" value={`${current.pressure}`} label="hPa" />
          </div>
        </div>
      </div>

      {/* ── forecast tabs ── */}
      <Tabs defaultValue="0">
        <TabsList className="mx-3 my-1 grid grid-cols-3 bg-transparent">
          {forecast.slice(0, 3).map((day, i) => {
            const dayType =
              WWO_CODE[day.weatherCode as keyof typeof WWO_CODE] ?? 'Cloudy'
            const dayEmoji = (THEME[dayType] ?? DEFAULT_THEME).emoji
            return (
              <TabsTrigger
                key={i}
                value={String(i)}
                className="flex flex-col gap-1 py-1 text-xs"
              >
                <span className="text-base leading-none">{dayEmoji}</span>
                <span className="font-medium">
                  {formatTabLabel(day.date, i)}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {forecast.slice(0, 3).map((day, i) => (
          <TabsContent key={i} value={String(i)} className="p-0">
            <WeatherForecast forecast={day} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
