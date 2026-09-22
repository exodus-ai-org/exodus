import type { WeatherResult } from '@exodus/shared/types/weather'
import { WWO_CODE } from '@exodus/shared/types/weather'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon
} from 'lucide-react'

import { i18n } from '@/lib/i18n'

/**
 * Shared by the weather-card variants: the condition → icon mapping (the one
 * place the condition gets a colour — the icon's, never a surface's) and the
 * sample data. Prototype surface: deleted when a variant is promoted.
 */

export interface Condition {
  Icon: LucideIcon
  /** The icon's tint — a single accent on an otherwise token-only card. */
  tint: string
}

const CONDITIONS: Record<string, Condition> = {
  Sunny: { Icon: Sun, tint: 'text-amber-500' },
  PartlyCloudy: { Icon: CloudSun, tint: 'text-amber-500/80' },
  Cloudy: { Icon: Cloud, tint: 'text-muted-foreground' },
  VeryCloudy: { Icon: Cloud, tint: 'text-muted-foreground' },
  Fog: { Icon: CloudFog, tint: 'text-muted-foreground' },
  LightShowers: { Icon: CloudDrizzle, tint: 'text-sky-500' },
  LightSleetShowers: { Icon: CloudDrizzle, tint: 'text-sky-500' },
  LightSleet: { Icon: CloudSnow, tint: 'text-sky-400' },
  LightSnow: { Icon: CloudSnow, tint: 'text-sky-400' },
  HeavySnow: { Icon: CloudSnow, tint: 'text-sky-400' },
  LightRain: { Icon: CloudRain, tint: 'text-sky-500' },
  HeavyShowers: { Icon: CloudRain, tint: 'text-sky-600' },
  HeavyRain: { Icon: CloudRain, tint: 'text-sky-600' },
  ThunderyShowers: { Icon: CloudLightning, tint: 'text-violet-500' },
  ThunderyHeavyRain: { Icon: CloudLightning, tint: 'text-violet-500' },
  ThunderySnowShowers: { Icon: CloudLightning, tint: 'text-violet-500' }
}

export function conditionOf(weatherCode: string): Condition {
  const name = WWO_CODE[weatherCode as keyof typeof WWO_CODE] ?? 'Cloudy'
  return CONDITIONS[name] ?? CONDITIONS.Cloudy
}

/** "0" | "300" | … | "2100" (wttr.in hourly slots) → "3 PM". */
export function hourLabel(time: string): string {
  const h = Math.floor(Number(time) / 100)
  const d = new Date(2026, 0, 1, h)
  return d.toLocaleTimeString('en', { hour: 'numeric' })
}

export function weekdayLabel(date: string, i: number): string {
  if (i === 0) return i18n.t('chat:weatherCard.today')
  if (i === 1) return i18n.t('chat:weatherCard.tomorrow')
  return new Date(date).toLocaleDateString('en', { weekday: 'short' })
}

const hourly = (temps: number[], codes: string[], rain: number[]) =>
  temps.map((tempC, i) => ({
    time: String(i * 300),
    tempC: String(tempC),
    weatherCode: codes[i] ?? '113',
    condition: WWO_CODE[(codes[i] ?? '113') as keyof typeof WWO_CODE],
    rainChance: String(rain[i] ?? 0)
  }))

/** Oslo, a clear September noon. */
export const SAMPLE: WeatherResult = {
  location: 'Oslo, Norway',
  current: {
    condition: 'Sunny',
    weatherCode: '113',
    tempC: '21',
    feelsLikeC: '21',
    humidity: '40',
    windKmph: '8',
    windDirDegree: '180',
    windDir: 'S',
    precipMM: '0.0',
    uvIndex: '5',
    visibility: '10',
    pressure: '1015',
    observedAt: '12:00 PM'
  },
  forecast: [
    {
      date: '2026-09-22',
      condition: 'Sunny',
      weatherCode: '113',
      maxTempC: '22',
      minTempC: '11',
      sunrise: '06:52 AM',
      sunset: '07:18 PM',
      hourly: hourly(
        [12, 11, 13, 17, 21, 22, 19, 14],
        ['113', '113', '113', '113', '113', '113', '116', '116'],
        [0, 0, 0, 0, 0, 0, 5, 10]
      )
    },
    {
      date: '2026-09-23',
      condition: 'Partly cloudy',
      weatherCode: '116',
      maxTempC: '18',
      minTempC: '10',
      sunrise: '06:54 AM',
      sunset: '07:15 PM',
      hourly: hourly(
        [11, 10, 11, 14, 17, 18, 16, 12],
        ['116', '116', '116', '116', '116', '119', '119', '119'],
        [10, 10, 15, 20, 20, 30, 40, 40]
      )
    },
    {
      date: '2026-09-24',
      condition: 'Light rain',
      weatherCode: '296',
      maxTempC: '14',
      minTempC: '9',
      sunrise: '06:56 AM',
      sunset: '07:12 PM',
      hourly: hourly(
        [10, 9, 10, 12, 14, 13, 12, 10],
        ['119', '296', '296', '296', '296', '353', '119', '119'],
        [50, 70, 80, 85, 80, 70, 40, 30]
      )
    },
    // Four more days — what a week looks like (wttr.in stops at three;
    // Open-Meteo would carry the card this far).
    {
      date: '2026-09-25',
      condition: 'Heavy showers',
      weatherCode: '356',
      maxTempC: '12',
      minTempC: '8',
      sunrise: '06:58 AM',
      sunset: '07:09 PM',
      hourly: hourly(
        [9, 8, 8, 10, 12, 12, 11, 9],
        ['296', '356', '356', '356', '305', '356', '296', '119'],
        [80, 90, 95, 95, 90, 85, 70, 50]
      )
    },
    {
      date: '2026-09-26',
      condition: 'Cloudy',
      weatherCode: '119',
      maxTempC: '13',
      minTempC: '7',
      sunrise: '07:00 AM',
      sunset: '07:06 PM',
      hourly: hourly(
        [8, 7, 8, 10, 13, 13, 11, 9],
        ['119', '119', '122', '119', '119', '116', '116', '119'],
        [30, 30, 20, 20, 10, 10, 10, 20]
      )
    },
    {
      date: '2026-09-27',
      condition: 'Partly cloudy',
      weatherCode: '116',
      maxTempC: '15',
      minTempC: '6',
      sunrise: '07:02 AM',
      sunset: '07:03 PM',
      hourly: hourly(
        [7, 6, 7, 11, 15, 15, 12, 9],
        ['113', '113', '116', '116', '116', '113', '113', '113'],
        [0, 0, 5, 10, 10, 5, 0, 0]
      )
    },
    {
      date: '2026-09-28',
      condition: 'Sunny',
      weatherCode: '113',
      maxTempC: '16',
      minTempC: '5',
      sunrise: '07:04 AM',
      sunset: '07:00 PM',
      hourly: hourly(
        [6, 5, 6, 11, 16, 16, 13, 9],
        ['113', '113', '113', '113', '113', '113', '113', '113'],
        [0, 0, 0, 0, 0, 0, 0, 0]
      )
    }
  ]
}
