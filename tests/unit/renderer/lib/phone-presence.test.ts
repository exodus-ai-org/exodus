import { describe, expect, it } from 'vitest'

import { isPhoneOnline, PHONE_ONLINE_WINDOW_MS } from '@/lib/phone-presence'

const NOW = Date.parse('2026-10-08T10:00:00.000Z')
const state = (lastSeenAt: string | null) => ({
  devices: [
    {
      id: 'd1',
      name: 'Phone',
      createdAt: '2026-10-01T00:00:00.000Z',
      lastSeenAt
    }
  ],
  pairing: null,
  lanRunning: true
})

describe('isPhoneOnline', () => {
  it('is a phone seen within the last five minutes', () => {
    expect(
      isPhoneOnline(
        state(new Date(NOW - PHONE_ONLINE_WINDOW_MS).toISOString()),
        NOW
      )
    ).toBe(true)
    expect(
      isPhoneOnline(
        state(new Date(NOW - PHONE_ONLINE_WINDOW_MS - 1).toISOString()),
        NOW
      )
    ).toBe(false)
  })

  it('is nothing without a device, a visit, or a readable time', () => {
    expect(isPhoneOnline(undefined, NOW)).toBe(false)
    expect(
      isPhoneOnline({ devices: [], pairing: null, lanRunning: true }, NOW)
    ).toBe(false)
    expect(isPhoneOnline(state(null), NOW)).toBe(false)
    expect(isPhoneOnline(state('yesterday-ish'), NOW)).toBe(false)
  })
})
