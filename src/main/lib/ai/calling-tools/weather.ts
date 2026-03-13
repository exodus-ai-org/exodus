import { tool } from 'ai'
import { z } from 'zod'

export const weather = tool({
  description:
    'Get current weather conditions and a short forecast for a location.',
  inputSchema: z.object({
    location: z
      .string()
      .describe('City name or location, e.g. "Tokyo", "New York, NY".')
  }),
  execute: async ({ location }) => {
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=j1`
    )
    if (!response.ok) {
      throw new Error(`Weather service returned ${response.status}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (await response.json()) as any

    const current = raw.current_condition?.[0]
    const area = raw.nearest_area?.[0]

    return {
      location: [area?.areaName?.[0]?.value, area?.country?.[0]?.value]
        .filter(Boolean)
        .join(', '),
      current: {
        condition: current?.weatherDesc?.[0]?.value,
        tempC: current?.temp_C,
        tempF: current?.temp_F,
        feelsLikeC: current?.FeelsLikeC,
        feelsLikeF: current?.FeelsLikeF,
        humidity: current?.humidity + '%',
        windKmph: current?.windspeedKmph,
        windDirection: current?.winddir16Point,
        visibility: current?.visibility + ' km',
        uvIndex: current?.uvIndex
      },
      forecast: (raw.weather ?? []).slice(0, 3).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (day: any) => ({
          date: day.date,
          condition: day.hourly?.[4]?.weatherDesc?.[0]?.value,
          maxTempC: day.maxtempC,
          minTempC: day.mintempC
        })
      )
    }
  }
})
