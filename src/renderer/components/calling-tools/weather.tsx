import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Weather as IWeather,
  WeatherAPIResponse,
  WWO_CODE
} from '@shared/types/weather'
import { motion } from 'framer-motion'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Thermometer,
  Wind
} from 'lucide-react'
import { useEffect, useState } from 'react'

export function Weather({ toolResult }: { toolResult: string }) {
  const [dataSource, setDataSource] = useState<WeatherAPIResponse | null>(null)

  const rainVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 }
  }
  useEffect(() => {
    try {
      setDataSource(JSON.parse(toolResult))
    } catch {
      // Do nothing...
    }
  }, [toolResult])

  if (!dataSource) return null

  const current = dataSource.current_condition[0]
  const location = dataSource.nearest_area[0]
  const forecast = dataSource.weather

  const getWeatherIcon = (code: string) => {
    const weatherType = WWO_CODE[code as keyof typeof WWO_CODE] || 'Cloudy'

    switch (weatherType) {
      case 'Sunny':
        return <Sun className="h-8 w-8 text-yellow-400" />
      case 'PartlyCloudy':
        return <CloudSun className="h-8 w-8 text-blue-400" />
      case 'Cloudy':
        return <Cloud className="h-8 w-8 text-slate-400" />
      case 'VeryCloudy':
        return <Cloud className="h-8 w-8 text-slate-600" />
      case 'Fog':
        return <CloudFog className="h-8 w-8 text-slate-300" />
      case 'LightShowers':
        return <CloudDrizzle className="h-8 w-8 text-blue-300" />
      case 'LightSleetShowers':
      case 'LightSleet':
        return <CloudSnow className="h-8 w-8 text-blue-200" />
      case 'LightSnow':
      case 'LightSnowShowers':
        return <CloudSnow className="h-8 w-8 text-slate-200" />
      case 'HeavySnow':
      case 'HeavySnowShowers':
        return <CloudSnow className="h-8 w-8 text-white" />
      case 'ThunderyShowers':
      case 'ThunderyHeavyRain':
      case 'ThunderySnowShowers':
        return <CloudLightning className="h-8 w-8 text-yellow-500" />
      case 'LightRain':
        return <CloudRain className="h-8 w-8 text-blue-400" />
      case 'HeavyShowers':
      case 'HeavyRain':
        return <CloudRain className="h-8 w-8 text-blue-600" />
      default:
        return <Cloud className="h-8 w-8 text-slate-400" />
    }
  }

  return (
    <Card className="w-full max-w-md overflow-hidden p-0 shadow-lg transition-all duration-300 hover:shadow-xl">
      <CardContent className="p-0">
        <div className="relative overflow-hidden">
          <div
            className={`absolute inset-0 ${
              WWO_CODE[current.weatherCode as keyof typeof WWO_CODE] === 'Sunny'
                ? 'bg-gradient-to-br from-sky-400 to-blue-500'
                : 'bg-gradient-to-br from-slate-500 to-slate-700'
            } transition-colors duration-500`}
          />

          {(WWO_CODE[current.weatherCode as keyof typeof WWO_CODE] ===
            'LightRain' ||
            WWO_CODE[current.weatherCode as keyof typeof WWO_CODE] ===
              'HeavyRain' ||
            WWO_CODE[current.weatherCode as keyof typeof WWO_CODE] ===
              'LightShowers' ||
            WWO_CODE[current.weatherCode as keyof typeof WWO_CODE] ===
              'HeavyShowers') && (
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-4 w-0.5 rounded-full bg-blue-200 opacity-70"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `-${Math.random() * 10}%`
                  }}
                  variants={rainVariants}
                  initial="initial"
                  animate="animate"
                  transition={{
                    duration: 0.8,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: 'loop',
                    delay: Math.random() * 2,
                    ease: 'linear'
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {location.areaName[0].value}, {location.country[0].value}
                </h2>
                <p className="text-sm opacity-90">{current.localObsDateTime}</p>
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex items-center"
              >
                {getWeatherIcon(current.weatherCode)}
                <span className="ml-2 text-4xl font-bold">
                  {current.temp_C}°
                </span>
              </motion.div>
            </div>

            <p className="mt-2 text-lg">{current.weatherDesc[0].value}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center rounded-lg bg-white/10 p-2">
                <Thermometer className="mb-1 h-5 w-5" />
                <span className="text-sm">Feels like</span>
                <span className="font-medium">{current.FeelsLikeC}°C</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-white/10 p-2">
                <Wind className="mb-1 h-5 w-5" />
                <span className="text-sm">Wind</span>
                <span className="font-medium">
                  {current.windspeedKmph} km/h
                </span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-white/10 p-2">
                <Droplets className="mb-1 h-5 w-5" />
                <span className="text-sm">Humidity</span>
                <span className="font-medium">{current.humidity}%</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="today" className="w-full p-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
            <TabsTrigger value="dayafter">Day After</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="p-0">
            <WeatherForecast forecast={forecast[0]} />
          </TabsContent>
          <TabsContent value="tomorrow" className="p-0">
            <WeatherForecast forecast={forecast[1]} />
          </TabsContent>
          <TabsContent value="dayafter" className="p-0">
            <WeatherForecast forecast={forecast[2]} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function WeatherForecast({ forecast }: { forecast: IWeather }) {
  const getWeatherIcon = (code: string) => {
    const weatherType = WWO_CODE[code as keyof typeof WWO_CODE] || 'Cloudy'

    switch (weatherType) {
      case 'Sunny':
        return <Sun className="h-5 w-5 text-yellow-400" />
      case 'PartlyCloudy':
        return <CloudSun className="h-5 w-5 text-blue-400" />
      case 'Cloudy':
        return <Cloud className="h-5 w-5 text-slate-400" />
      case 'VeryCloudy':
        return <Cloud className="h-5 w-5 text-slate-600" />
      case 'Fog':
        return <CloudFog className="h-5 w-5 text-slate-300" />
      case 'LightShowers':
        return <CloudDrizzle className="h-5 w-5 text-blue-300" />
      case 'LightSleetShowers':
      case 'LightSleet':
        return <CloudSnow className="h-5 w-5 text-blue-200" />
      case 'LightSnow':
      case 'LightSnowShowers':
        return <CloudSnow className="h-5 w-5 text-slate-200" />
      case 'HeavySnow':
      case 'HeavySnowShowers':
        return <CloudSnow className="h-5 w-5 text-white" />
      case 'ThunderyShowers':
      case 'ThunderyHeavyRain':
      case 'ThunderySnowShowers':
        return <CloudLightning className="h-5 w-5 text-yellow-500" />
      case 'LightRain':
        return <CloudRain className="h-5 w-5 text-blue-400" />
      case 'HeavyShowers':
      case 'HeavyRain':
        return <CloudRain className="h-5 w-5 text-blue-600" />
      default:
        return <Cloud className="h-5 w-5 text-slate-400" />
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

      <div className="flex gap-4 overflow-x-scroll">
        {forecast.hourly.map((hourly, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex shrink-0 flex-col items-center"
          >
            <span className="text-muted-foreground text-xs">
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
    </div>
  )
}
