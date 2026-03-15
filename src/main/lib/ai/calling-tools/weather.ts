import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

interface WttrCondition {
  weatherDesc?: Array<{ value?: string }>
  weatherCode?: string
  temp_C?: string
  FeelsLikeC?: string
  humidity?: string
  windspeedKmph?: string
  winddirDegree?: string
  winddir16Point?: string
  precipMM?: string
  uvIndex?: string
  visibility?: string
  pressure?: string
  localObsDateTime?: string
}

interface WttrArea {
  areaName?: Array<{ value?: string }>
  country?: Array<{ value?: string }>
}

interface WttrHourly {
  time?: string
  tempC?: string
  weatherCode?: string
  weatherDesc?: Array<{ value?: string }>
  chanceofrain?: string
}

interface WttrDay {
  date?: string
  maxtempC?: string
  mintempC?: string
  astronomy?: Array<{ sunrise?: string; sunset?: string }>
  hourly?: WttrHourly[]
}

interface WttrResponse {
  current_condition?: WttrCondition[]
  nearest_area?: WttrArea[]
  weather?: WttrDay[]
}

const weatherSchema = Type.Object({
  location: Type.String({
    description: 'City name or location, e.g. "Tokyo", "New York, NY".'
  })
})

export const weather: AgentTool<typeof weatherSchema> = {
  name: 'weather',
  label: 'Weather',
  description:
    'Get current weather conditions and a short forecast for a location.',
  parameters: weatherSchema,
  execute: async (_toolCallId, { location }) => {
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=j1`
    )
    if (!response.ok) {
      throw new Error(`Weather service returned ${response.status}`)
    }
    const raw = (await response.json()) as WttrResponse

    const current = raw.current_condition?.[0]
    const area = raw.nearest_area?.[0]

    const details = {
      location: [area?.areaName?.[0]?.value, area?.country?.[0]?.value]
        .filter(Boolean)
        .join(', '),
      current: {
        condition: current?.weatherDesc?.[0]?.value?.trim() ?? '',
        weatherCode: current?.weatherCode ?? '',
        tempC: current?.temp_C ?? '',
        feelsLikeC: current?.FeelsLikeC ?? '',
        humidity: current?.humidity ?? '',
        windKmph: current?.windspeedKmph ?? '',
        windDirDegree: current?.winddirDegree ?? '',
        windDir: current?.winddir16Point ?? '',
        precipMM: current?.precipMM ?? '',
        uvIndex: current?.uvIndex ?? '',
        visibility: current?.visibility ?? '',
        pressure: current?.pressure ?? '',
        observedAt: current?.localObsDateTime ?? ''
      },
      forecast: (raw.weather ?? []).slice(0, 3).map((day) => ({
        date: day.date,
        condition: day.hourly?.[4]?.weatherDesc?.[0]?.value?.trim() ?? '',
        weatherCode: day.hourly?.[4]?.weatherCode ?? '',
        maxTempC: day.maxtempC,
        minTempC: day.mintempC,
        sunrise: day.astronomy?.[0]?.sunrise ?? '',
        sunset: day.astronomy?.[0]?.sunset ?? '',
        hourly: (day.hourly ?? []).map((h) => ({
          time: h.time,
          tempC: h.tempC,
          weatherCode: h.weatherCode,
          condition: h.weatherDesc?.[0]?.value?.trim() ?? '',
          rainChance: h.chanceofrain
        }))
      }))
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(details) }],
      details
    }
  }
}
