import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))

const { acquireLock, holdSingleInstanceLock } =
  await import('@main/lib/single-instance')

/** A fake clock the lock's sleep() advances, and a scripted holder. */
function scenario(opts: {
  /** The holder goes away (lock frees up) at this time, if ever. */
  holderExitsAt?: number
  /** The holder acknowledges every attempt (it is up and staying). */
  holderAnswers?: boolean
}) {
  let now = 1_000_000
  let ack: number | null = null
  let attempts = 0
  const started = now
  const outcome = acquireLock({
    request: () => {
      attempts++
      const free =
        opts.holderExitsAt !== undefined && now - started >= opts.holderExitsAt
      if (!free && opts.holderAnswers) ack = now
      return free
    },
    sleep: (ms) => {
      now += ms
    },
    now: () => now,
    lastAck: () => ack
  })
  return { outcome, attempts, waited: now - started }
}

describe('acquireLock', () => {
  it('takes a free lock on the first attempt, without waiting', () => {
    expect(scenario({ holderExitsAt: 0 })).toEqual({
      outcome: 'acquired',
      attempts: 1,
      waited: 0
    })
  })

  it('gives way at once to an instance that is running and says so', () => {
    const { outcome, attempts, waited } = scenario({ holderAnswers: true })
    expect(outcome).toBe('already-running')
    expect(attempts).toBe(1)
    expect(waited).toBeLessThan(1000)
  })

  // Quit, then reopened straight away: the old process is still closing PGlite.
  it('waits out an instance that is quitting, then takes over', () => {
    const { outcome, waited } = scenario({ holderExitsAt: 4000 })
    expect(outcome).toBe('acquired')
    expect(waited).toBeGreaterThanOrEqual(4000)
    expect(waited).toBeLessThan(5000)
  })

  it('gives up on a holder that neither answers nor leaves — and never claims the lock', () => {
    const { outcome, waited } = scenario({})
    expect(outcome).toBe('timed-out')
    // Longer than the 5s a clean PGlite shutdown may take.
    expect(waited).toBeGreaterThan(5000)
  })

  it('ignores an acknowledgement left over from an earlier launch', () => {
    let now = 1_000_000
    const staleAck = now - 60_000
    const outcome = acquireLock({
      request: () => now >= 1_002_000,
      sleep: (ms) => {
        now += ms
      },
      now: () => now,
      lastAck: () => staleAck
    })
    expect(outcome).toBe('acquired')
  })
})

describe('holdSingleInstanceLock', () => {
  it('is a no-op where there is no Electron app to lock (unit tests loading db.ts)', () => {
    expect(() => holdSingleInstanceLock()).not.toThrow()
  })
})
