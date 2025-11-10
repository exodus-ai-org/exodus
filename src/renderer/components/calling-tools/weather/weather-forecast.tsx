import { Weather, WWO_CODE } from '@shared/types/weather'
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

export function WeatherForecast({ forecast }: { forecast: Weather }) {
  const getWeatherIcon = (code: string) => {
    const weatherType = WWO_CODE[code as keyof typeof WWO_CODE] || 'Cloudy'

    switch (weatherType) {
      case 'Sunny':
        return <SunIcon className="h-5 w-5 text-yellow-400" />
      case 'PartlyCloudy':
        return <CloudSunIcon className="h-5 w-5 text-blue-400" />
      case 'Cloudy':
        return <CloudIcon className="h-5 w-5 text-slate-400" />
      case 'VeryCloudy':
        return <CloudIcon className="h-5 w-5 text-slate-600" />
      case 'Fog':
        return <CloudFogIcon className="h-5 w-5 text-slate-300" />
      case 'LightShowers':
        return <CloudDrizzleIcon className="h-5 w-5 text-blue-300" />
      case 'LightSleetShowers':
      case 'LightSleet':
        return <CloudSnowIcon className="h-5 w-5 text-blue-200" />
      case 'LightSnow':
      case 'LightSnowShowers':
        return <CloudSnowIcon className="h-5 w-5 text-slate-200" />
      case 'HeavySnow':
      case 'HeavySnowShowers':
        return <CloudSnowIcon className="h-5 w-5 text-white" />
      case 'ThunderyShowers':
      case 'ThunderyHeavyRain':
      case 'ThunderySnowShowers':
        return <CloudLightningIcon className="h-5 w-5 text-yellow-500" />
      case 'LightRain':
        return <CloudRainIcon className="h-5 w-5 text-blue-400" />
      case 'HeavyShowers':
      case 'HeavyRain':
        return <CloudRainIcon className="h-5 w-5 text-blue-600" />
      default:
        return <CloudIcon className="h-5 w-5 text-slate-400" />
    }
  }

  // Format time from 24h to 12h
  const formatTime = (time2400: string) => {
    const hours24 = Number.parseInt(time2400) / 100
    let hours12 = hours24 % 12
    const ampm = hours24 < 12 ? 'AM' : 'PM'

    if (hours12 === 0) {
      hours12 = 12 // Midnight in 12-hour format is 12
    }

    const minutes = '00' // Since your input is always on the hour

    return `${hours12}:${minutes} ${ampm}`
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Min / Max</p>
          <p className="font-medium">
            {forecast.mintempC}° / {forecast.maxtempC}°
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Sunrise / Sunset</p>
          <p className="font-medium">
            {forecast.astronomy[0].sunrise} / {forecast.astronomy[0].sunset}
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="no-scrollbar flex gap-5 overflow-x-scroll">
          {forecast.hourly.map((hourly, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex shrink-0 flex-col items-center"
            >
              <span className="text-muted-foreground mb-1 text-xs">
                {formatTime(hourly.time)}
              </span>
              {getWeatherIcon(hourly.weatherCode)}
              <span className="mt-1 font-medium">{hourly.tempC}°</span>
              <span className="text-muted-foreground text-xs">
                {hourly.chanceofrain}%
              </span>
            </motion.div>
          ))}
        </div>
        <div className="from-card pointer-events-none absolute top-0 right-0 h-full w-12 bg-linear-to-l to-transparent" />
      </div>
    </div>
  )
}
