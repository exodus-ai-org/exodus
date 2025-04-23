import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WeatherAPIResponse, WWO_CODE } from '@shared/types/weather'
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
  Eye,
  Gauge,
  Sun,
  Thermometer,
  Umbrella,
  Wind
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { WeatherForecast } from './weather-forecast'

export function WeatherCard({ toolResult }: { toolResult: string }) {
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
                <p className="text-sm opacity-90">
                  {current.localObsDateTime} (Local Time)
                </p>
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

            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center rounded-lg bg-white/10 p-2">
                <Thermometer className="mb-1 h-5 w-5" />
                <span className="text-sm">Feels like</span>
                <span className="font-medium">{current.FeelsLikeC}°C</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-white/10 p-2">
                <Droplets className="mb-1 h-5 w-5" />
                <span className="text-sm">Humidity</span>
                <span className="font-medium">{current.humidity}%</span>
              </div>
              <div className="col-span-2 flex flex-col items-center rounded-lg bg-white/10 p-2">
                <Wind className="mb-1 h-5 w-5" />
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm">Wind</span>
                  <span className="font-medium">
                    {current.windspeedKmph} km/h
                  </span>
                </div>
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm">Direction</span>
                  <span className="font-medium">
                    {current.winddirDegree}° {current.winddir16Point}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center rounded-lg bg-white/10 p-2">
                <Umbrella className="mb-1 h-5 w-5" />
                <span className="text-sm">Precipitation</span>
                <span className="font-medium">{current.precipMM}mm</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-white/10 p-2">
                <Sun className="mb-1 h-5 w-5" />
                <span className="text-sm">UV Index</span>
                <span className="font-medium">{current.uvIndex}</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-white/10 p-2">
                <Eye className="mb-1 h-5 w-5" />
                <span className="text-sm">Visibility</span>
                <span className="font-medium">{current.visibility}km</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-white/10 p-2">
                <Gauge className="mb-1 h-5 w-5" />
                <span className="text-sm">Pressure</span>
                <span className="font-medium">{current.pressure}hPa</span>
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
