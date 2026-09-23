import {
  conditionNameOf,
  weatherClockHours
} from '@exodus/shared/types/weather'
import { describe, expect, it } from 'vitest'

describe('weatherClockHours', () => {
  it("reads Open-Meteo's ISO local times", () => {
    expect(weatherClockHours('2026-09-23T06:02')).toBeCloseTo(6 + 2 / 60)
    expect(weatherClockHours('2026-09-23T18:30')).toBe(18.5)
  })

  it("reads wttr.in's clocks and hourly slots on rows saved before the switch", () => {
    expect(weatherClockHours('06:52 AM')).toBeCloseTo(6 + 52 / 60)
    expect(weatherClockHours('07:18 PM')).toBeCloseTo(19.3)
    expect(weatherClockHours('12:05 AM')).toBeCloseTo(5 / 60)
    expect(weatherClockHours('0')).toBe(0)
    expect(weatherClockHours('300')).toBe(3)
    expect(weatherClockHours('2100')).toBe(21)
  })

  it('gives null for anything else, so a label falls back to the raw text', () => {
    expect(weatherClockHours('')).toBeNull()
    expect(weatherClockHours('noon')).toBeNull()
  })
})

describe('conditionNameOf', () => {
  it('reads WMO codes first, WWO codes for old rows, and defaults to Cloudy', () => {
    expect(conditionNameOf('0')).toBe('Sunny')
    expect(conditionNameOf('3')).toBe('Cloudy')
    expect(conditionNameOf('95')).toBe('ThunderyShowers')
    expect(conditionNameOf('113')).toBe('Sunny')
    expect(conditionNameOf('296')).toBe('LightRain')
    expect(conditionNameOf('4242')).toBe('Cloudy')
  })
})
