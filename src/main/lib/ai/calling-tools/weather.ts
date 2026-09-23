import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type } from '@earendil-works/pi-ai'
import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'
import {
  WMO_CODE,
  type WeatherForecastDay,
  type WeatherResult
} from '@exodus/shared/types/weather'

/**
 * Weather from Open-Meteo (open-meteo.com): no key, no account, a seven-day
 * forecast with 24 hourly points a day and WMO weather codes. Two calls —
 * the place is geocoded first — both in the place's local time
 * (`timezone=auto`). The result keeps the shape the card has always read;
 * rows from the wttr.in years differ only in their time strings and codes
 * (see `types/weather.ts`).
 */

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const FORECAST_DAYS = 7

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'weather_code',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m'
]
const HOURLY_FIELDS = [
  'temperature_2m',
  'weather_code',
  'precipitation_probability',
  'uv_index',
  'visibility'
]
const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset'
]

interface GeocodingResponse {
  results?: Array<{
    name: string
    country?: string
    admin1?: string
    latitude: number
    longitude: number
  }>
}

interface ForecastResponse {
  current: {
    time: string
    temperature_2m: number
    relative_humidity_2m: number
    apparent_temperature: number
    is_day: number
    precipitation: number
    weather_code: number
    pressure_msl: number
    wind_speed_10m: number
    wind_direction_10m: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    precipitation_probability: Array<number | null>
    uv_index: Array<number | null>
    visibility: Array<number | null>
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    sunrise: string[]
    sunset: string[]
  }
}

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW'
]

/** 181° → "S": sixteen points, 22.5° each, N centred on 0. */
export function compassPoint(degrees: number): string {
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16]
}

const whole = (n: number | null | undefined) =>
  n == null ? '' : String(Math.round(n))
const oneDecimal = (n: number | null | undefined) =>
  n == null ? '' : (Math.round(n * 10) / 10).toFixed(1)
const conditionText = (code: number) => WMO_CODE[String(code)]?.text ?? 'Cloudy'

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Weather service returned ${response.status}`)
  }
  return (await response.json()) as T
}

/** Open-Meteo's response → the card's shape. Exported for the test. */
export function toWeatherResult(
  location: string,
  raw: ForecastResponse
): WeatherResult {
  const { current, hourly, daily } = raw
  // Hourly-only readings for "now": the slot the observation falls in.
  const nowSlot = Math.max(
    0,
    hourly.time.findIndex((t) => t > current.time) - 1
  )
  const visibilityM = hourly.visibility[nowSlot]

  const forecast: WeatherForecastDay[] = daily.time.map((date, d) => {
    const slots = hourly.time
      .map((time, i) => ({ time, i }))
      .filter(({ time }) => time.startsWith(date))
    return {
      date,
      condition: conditionText(daily.weather_code[d]),
      weatherCode: String(daily.weather_code[d]),
      maxTempC: whole(daily.temperature_2m_max[d]),
      minTempC: whole(daily.temperature_2m_min[d]),
      sunrise: daily.sunrise[d],
      sunset: daily.sunset[d],
      hourly: slots.map(({ time, i }) => ({
        time,
        tempC: whole(hourly.temperature_2m[i]),
        weatherCode: String(hourly.weather_code[i]),
        condition: conditionText(hourly.weather_code[i]),
        rainChance: whole(hourly.precipitation_probability[i] ?? 0)
      }))
    }
  })

  return {
    location,
    current: {
      condition: conditionText(current.weather_code),
      weatherCode: String(current.weather_code),
      tempC: whole(current.temperature_2m),
      feelsLikeC: whole(current.apparent_temperature),
      humidity: whole(current.relative_humidity_2m),
      windKmph: whole(current.wind_speed_10m),
      windDirDegree: whole(current.wind_direction_10m),
      windDir: compassPoint(current.wind_direction_10m),
      precipMM: oneDecimal(current.precipitation),
      uvIndex: whole(hourly.uv_index[nowSlot] ?? 0),
      visibility: visibilityM == null ? '' : whole(visibilityM / 1000),
      pressure: whole(current.pressure_msl),
      observedAt: current.time,
      isDay: current.is_day === 1
    },
    forecast
  }
}

const weatherSchema = Type.Object({
  location: Type.String({
    description:
      'City name or place, e.g. "Tokyo", "Oslo, Norway", "Austin, TX".'
  })
})

export const weather: AgentTool<typeof weatherSchema> = {
  name: TOOL_NAMES.weather,
  label: 'Weather',
  description:
    "Current weather conditions and a seven-day forecast (hourly temperatures, rain chance, sunrise and sunset) for a place. Times are the place's local time.",
  parameters: weatherSchema,
  execute: async (_toolCallId, { location }, signal) => {
    if (signal?.aborted) throw new Error('Aborted')

    const geo = await getJson<GeocodingResponse>(
      `${GEOCODING_URL}?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
      signal
    )
    const place = geo.results?.[0]
    if (!place) throw new Error(`No place found for "${location}"`)

    const query = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: CURRENT_FIELDS.join(','),
      hourly: HOURLY_FIELDS.join(','),
      daily: DAILY_FIELDS.join(','),
      timezone: 'auto',
      forecast_days: String(FORECAST_DAYS)
    })
    const raw = await getJson<ForecastResponse>(
      `${FORECAST_URL}?${query}`,
      signal
    )

    const details = toWeatherResult(
      [place.name, place.country].filter(Boolean).join(', '),
      raw
    )
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(details) }],
      details
    }
  }
}
