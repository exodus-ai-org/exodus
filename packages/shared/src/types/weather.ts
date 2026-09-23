// ── Tool result shape (returned by the `weather` calling-tool) ────────────────
//
// Times are the place's local time. New rows carry ISO local timestamps
// ("2026-09-23T06:02"); rows saved before the Open-Meteo switch carry
// wttr.in's forms ("300" for an hourly slot, "06:52 AM" for sunrise) and the
// card reads both.

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
    /** False at night — a clear night is a moon, not a sun. Absent on old rows. */
    isDay?: boolean
  }
  forecast: WeatherForecastDay[]
}

// ── Conditions ────────────────────────────────────────────────────────────────

/** The condition vocabulary the card draws from — one icon per name. */
export type WeatherConditionName =
  | 'Sunny'
  | 'PartlyCloudy'
  | 'Cloudy'
  | 'VeryCloudy'
  | 'Fog'
  | 'LightShowers'
  | 'LightSleetShowers'
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
  | 'ThunderySnowShowers'

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

/**
 * World Weather Online codes, which wttr.in returned. Rows saved before the
 * Open-Meteo switch (2026-09-23) carry these; the two ranges do not overlap
 * (WMO is 0–99, WWO 113–395), so `conditionNameOf` reads either.
 */
export const WWO_CODE: Record<string, WeatherConditionName> = {
  '113': 'Sunny',
  '116': 'PartlyCloudy',
  '119': 'Cloudy',
  '122': 'VeryCloudy',
  '143': 'Fog',
  '176': 'LightShowers',
  '179': 'LightSleetShowers',
  '182': 'LightSleet',
  '185': 'LightSleet',
  '200': 'ThunderyShowers',
  '227': 'LightSnow',
  '230': 'HeavySnow',
  '248': 'Fog',
  '260': 'Fog',
  '263': 'LightShowers',
  '266': 'LightRain',
  '281': 'LightSleet',
  '284': 'LightSleet',
  '293': 'LightRain',
  '296': 'LightRain',
  '299': 'HeavyShowers',
  '302': 'HeavyRain',
  '305': 'HeavyShowers',
  '308': 'HeavyRain',
  '311': 'LightSleet',
  '314': 'LightSleet',
  '317': 'LightSleet',
  '320': 'LightSnow',
  '323': 'LightSnowShowers',
  '326': 'LightSnowShowers',
  '329': 'HeavySnow',
  '332': 'HeavySnow',
  '335': 'HeavySnowShowers',
  '338': 'HeavySnow',
  '350': 'LightSleet',
  '353': 'LightShowers',
  '356': 'HeavyShowers',
  '359': 'HeavyRain',
  '362': 'LightSleetShowers',
  '365': 'LightSleetShowers',
  '368': 'LightSnowShowers',
  '371': 'HeavySnowShowers',
  '374': 'LightSleetShowers',
  '377': 'LightSleet',
  '386': 'ThunderyShowers',
  '389': 'ThunderyHeavyRain',
  '392': 'ThunderySnowShowers',
  '395': 'HeavySnowShowers'
}

export function conditionNameOf(weatherCode: string): WeatherConditionName {
  return WMO_CODE[weatherCode]?.name ?? WWO_CODE[weatherCode] ?? 'Cloudy'
}

/**
 * The hour of a weather time, as a fraction (13.5 = 13:30), in any of the
 * forms a row may carry: ISO local ("2026-09-23T06:02"), wttr.in's clock
 * ("06:52 AM") or its hourly slot ("0" … "2100"). `null` if none matches.
 */
export function weatherClockHours(time: string): number | null {
  const iso = /T(\d{2}):(\d{2})/u.exec(time)
  if (iso) return Number(iso[1]) + Number(iso[2]) / 60
  const clock = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/iu.exec(time.trim())
  if (clock) {
    let h = Number(clock[1]) % 12
    if (clock[3].toUpperCase() === 'PM') h += 12
    return h + Number(clock[2]) / 60
  }
  if (/^\d{1,4}$/u.test(time)) {
    const n = Number(time)
    return Math.floor(n / 100) + (n % 100) / 60
  }
  return null
}
