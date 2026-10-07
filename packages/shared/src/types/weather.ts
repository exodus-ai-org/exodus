// ── Tool result shape (returned by the `weather` calling-tool) ────────────────
//
// Times are the place's local time, as ISO local timestamps
// ("2026-09-23T06:02").

export interface WeatherHourly {
  time: string
  tempC: string
  weatherCode: string
  condition: string
  rainChance: string
}

export interface WeatherForecastDay {
  date: string
  condition: string
  weatherCode: string
  maxTempC: string
  minTempC: string
  sunrise: string
  sunset: string
  hourly: WeatherHourly[]
}

export interface WeatherResult {
  location: string
  current: {
    condition: string
    weatherCode: string
    tempC: string
    feelsLikeC: string
    humidity: string
    windKmph: string
    windDirDegree: string
    windDir: string
    precipMM: string
    uvIndex: string
    visibility: string
    pressure: string
    observedAt: string
    /** False at night — a clear night is a moon, not a sun. */
    isDay: boolean
  }
  forecast: WeatherForecastDay[]
}

// ── Conditions ────────────────────────────────────────────────────────────────

/** The condition vocabulary the card draws from — one icon per name. */
export type WeatherConditionName =
  | 'Sunny'
  | 'PartlyCloudy'
  | 'Cloudy'
  | 'Fog'
  | 'LightShowers'
  | 'LightSleet'
  | 'LightSnow'
  | 'LightSnowShowers'
  | 'HeavySnow'
  | 'HeavySnowShowers'
  | 'LightRain'
  | 'HeavyShowers'
  | 'HeavyRain'
  | 'ThunderyShowers'
  | 'ThunderyHeavyRain'

/**
 * WMO weather interpretation codes (what Open-Meteo returns) → the condition
 * name and the words for it.
 */
export const WMO_CODE: Record<
  string,
  { name: WeatherConditionName; text: string }
> = {
  '0': { name: 'Sunny', text: 'Clear sky' },
  '1': { name: 'Sunny', text: 'Mainly clear' },
  '2': { name: 'PartlyCloudy', text: 'Partly cloudy' },
  '3': { name: 'Cloudy', text: 'Overcast' },
  '45': { name: 'Fog', text: 'Fog' },
  '48': { name: 'Fog', text: 'Rime fog' },
  '51': { name: 'LightShowers', text: 'Light drizzle' },
  '53': { name: 'LightShowers', text: 'Drizzle' },
  '55': { name: 'LightShowers', text: 'Dense drizzle' },
  '56': { name: 'LightSleet', text: 'Freezing drizzle' },
  '57': { name: 'LightSleet', text: 'Dense freezing drizzle' },
  '61': { name: 'LightRain', text: 'Slight rain' },
  '63': { name: 'LightRain', text: 'Rain' },
  '65': { name: 'HeavyRain', text: 'Heavy rain' },
  '66': { name: 'LightSleet', text: 'Freezing rain' },
  '67': { name: 'LightSleet', text: 'Heavy freezing rain' },
  '71': { name: 'LightSnow', text: 'Slight snow' },
  '73': { name: 'LightSnow', text: 'Snow' },
  '75': { name: 'HeavySnow', text: 'Heavy snow' },
  '77': { name: 'LightSnow', text: 'Snow grains' },
  '80': { name: 'LightShowers', text: 'Slight rain showers' },
  '81': { name: 'HeavyShowers', text: 'Rain showers' },
  '82': { name: 'HeavyShowers', text: 'Violent rain showers' },
  '85': { name: 'LightSnowShowers', text: 'Slight snow showers' },
  '86': { name: 'HeavySnowShowers', text: 'Heavy snow showers' },
  '95': { name: 'ThunderyShowers', text: 'Thunderstorm' },
  '96': { name: 'ThunderyHeavyRain', text: 'Thunderstorm with hail' },
  '99': { name: 'ThunderyHeavyRain', text: 'Thunderstorm with heavy hail' }
}

export function conditionNameOf(weatherCode: string): WeatherConditionName {
  return WMO_CODE[weatherCode]?.name ?? 'Cloudy'
}

/**
 * The hour of a weather time, as a fraction (13.5 = 13:30), from its ISO
 * local form ("2026-09-23T06:02"). `null` if it is not one.
 */
export function weatherClockHours(time: string): number | null {
  const iso = /T(\d{2}):(\d{2})/u.exec(time)
  return iso ? Number(iso[1]) + Number(iso[2]) / 60 : null
}
