import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const lock = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '..',
      '..',
      '..',
      'packages',
      'shared',
      'src',
      'i18n',
      'locales',
      'en',
      'lock.json'
    ),
    'utf8'
  )
)

describe('lock namespace (en)', () => {
  it('has the shared incorrect-PIN key', () => {
    expect(lock.incorrectPin).toBe('Incorrect PIN')
  })

  it('has the lock screen keys', () => {
    expect(lock.screen.unlockWithTouchId).toBe('Unlock with Touch ID')
    expect(lock.screen.tooManyAttempts).toBe(
      'Too many attempts. Try again in {{seconds}}s.'
    )
  })

  it('has distinct "Unlock with Touch ID" copies for the screen vs. the settings toggle', () => {
    // Same English text, deliberately different keys — different UI roles
    // (an actionable button vs. a settings toggle label).
    expect(lock.privacy.touchIdToggleLabel).toBe(lock.screen.unlockWithTouchId)
  })

  it('has the enroll flow keys', () => {
    expect(lock.privacy.enroll).toMatchObject({
      enterLabel: 'Enter a 6-digit PIN',
      confirmLabel: 'Confirm your PIN',
      startOver: 'Start over'
    })
  })

  it('has all five idle-timeout preset labels', () => {
    expect(lock.privacy.idleOptions).toMatchObject({
      off: 'Off',
      oneMinute: '1 minute',
      fiveMinutes: '5 minutes',
      fifteenMinutes: '15 minutes',
      thirtyMinutes: '30 minutes'
    })
  })

  it('has the remove-lock flow keys, with distinct row/button/dialog copies', () => {
    expect(lock.privacy.removeLock.label).toBe('Remove lock')
    expect(lock.privacy.removeLock.button).toBe('Remove')
    expect(lock.privacy.removeLock.dialogTitle).toBe('Remove lock?')
    expect(lock.privacy.removeLock.confirmButton).toBe('Remove lock')
  })

  it('has the toast keys', () => {
    expect(lock.privacy.toast).toMatchObject({
      pinsDoNotMatch: 'PINs do not match',
      lockEnabled: 'Lock enabled',
      lockRemoved: 'Lock removed'
    })
    expect(lock.privacy.toast.setPinFailed).toMatchObject({
      title: 'Could not set PIN',
      description: 'A PIN already exists.'
    })
  })
})
