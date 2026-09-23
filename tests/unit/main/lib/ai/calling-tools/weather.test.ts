import { afterEach, describe, expect, it, vi } from 'vitest'

const { compassPoint, toWeatherResult, weather } =
  await import('@main/lib/ai/calling-tools/weather')

/** Two days of Open-Meteo, 24 hourly points each, observed at 18:30 day one. */
function forecastFixture() {
  const days = ['2026-09-23', '2026-09-24']
  const time = days.flatMap((d) =>
    Array.from(
      { length: 24 },
      (_, h) => `${d}T${String(h).padStart(2, '0')}:00`
    )
  )
  return {
    current: {
      time: '2026-09-23T18:30',
      temperature_2m: 30.0,
      relative_humidity_2m: 43,
      apparent_temperature: 30.5,
      is_day: 0,
      precipitation: 0.0,
      weather_code: 3,
      pressure_msl: 1013.3,
      wind_speed_10m: 11.0,
      wind_direction_10m: 181
    },
    hourly: {
      time,
      temperature_2m: time.map((_, i) => 20 + (i % 24) / 2),
      weather_code: time.map((_, i) => (i % 24 < 12 ? 1 : 61)),
      precipitation_probability: time.map((_, i) => (i % 24) * 4),
      uv_index: time.map((_, i) => (i % 24 === 18 ? 2.4 : 0)),
      visibility: time.map((_, i) => (i % 24 === 18 ? 11120 : 24140))
    },
    daily: {
      time: days,
      weather_code: [3, 61],
      temperature_2m_max: [32.5, 28.1],
      temperature_2m_min: [21.6, 19.9],
      sunrise: ['2026-09-23T06:02', '2026-09-24T06:03'],
      sunset: ['2026-09-23T18:10', '2026-09-24T18:08']
    }
  }
}

describe('compassPoint', () => {
  it('maps degrees onto the sixteen points, N centred on 0', () => {
    expect(compassPoint(0)).toBe('N')
    expect(compassPoint(11)).toBe('N')
    expect(compassPoint(12)).toBe('NNE')
    expect(compassPoint(90)).toBe('E')
    expect(compassPoint(181)).toBe('S')
    expect(compassPoint(359)).toBe('N')
  })
})

describe('toWeatherResult', () => {
  const result = toWeatherResult('Beijing, China', forecastFixture())

  it('reads now from `current`, and UV / visibility from the hour it falls in', () => {
    expect(result.location).toBe('Beijing, China')
    expect(result.current).toEqual({
      condition: 'Overcast',
      weatherCode: '3',
      tempC: '30',
      feelsLikeC: '31',
      humidity: '43',
      windKmph: '11',
      windDirDegree: '181',
      windDir: 'S',
      precipMM: '0.0',
      uvIndex: '2',
      visibility: '11',
      pressure: '1013',
      observedAt: '2026-09-23T18:30',
      isDay: false
    })
  })

  it('gives every day its code, its range, its sun and its 24 hours', () => {
    expect(result.forecast).toHaveLength(2)
    const [today, tomorrow] = result.forecast
    expect(today.date).toBe('2026-09-23')
    expect(today.condition).toBe('Overcast')
    expect(today.weatherCode).toBe('3')
    expect(today.maxTempC).toBe('33')
    expect(today.minTempC).toBe('22')
    expect(today.sunrise).toBe('2026-09-23T06:02')
    expect(today.sunset).toBe('2026-09-23T18:10')
    expect(today.hourly).toHaveLength(24)
    expect(today.hourly[0]).toEqual({
      time: '2026-09-23T00:00',
      tempC: '20',
      weatherCode: '1',
      condition: 'Mainly clear',
      rainChance: '0'
    })
    expect(today.hourly[13].condition).toBe('Slight rain')
    expect(tomorrow.hourly[0].time).toBe('2026-09-24T00:00')
    expect(tomorrow.condition).toBe('Slight rain')
  })
})

describe('weather tool', () => {
  afterEach(() => vi.unstubAllGlobals())

  const json = (body: unknown) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

  it('geocodes the place, then fetches seven days in its local time', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', (url: string) => {
      calls.push(url)
      if (url.startsWith('https://geocoding-api.open-meteo.com/'))
        return json({
          results: [
            {
              name: 'Beijing',
              country: 'China',
              latitude: 39.9075,
              longitude: 116.39723
            }
          ]
        })
      return json(forecastFixture())
    })

    const out = await weather.execute('call-1', { location: 'Beijing' })
    expect(calls[0]).toContain('name=Beijing')
    const forecastUrl = new URL(calls[1])
    expect(forecastUrl.searchParams.get('latitude')).toBe('39.9075')
    expect(forecastUrl.searchParams.get('timezone')).toBe('auto')
    expect(forecastUrl.searchParams.get('forecast_days')).toBe('7')
    expect(forecastUrl.searchParams.get('daily')).toContain('sunrise')
    expect(out.details.location).toBe('Beijing, China')
    expect(out.details.current.tempC).toBe('30')
    // The text block is the same JSON, for the model.
    expect(JSON.parse(out.content[0].text)).toEqual(out.details)
  })

  it('fails plainly when the place is unknown', async () => {
    vi.stubGlobal('fetch', () => json({ results: [] }))
    await expect(
      weather.execute('call-2', { location: 'Nowhereville' })
    ).rejects.toThrow('No place found for "Nowhereville"')
  })
})
