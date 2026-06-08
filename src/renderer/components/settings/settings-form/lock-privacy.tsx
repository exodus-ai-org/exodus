import { useState } from 'react'
import { sileo } from 'sileo'

import { PinInput } from '@/components/lock/pin-input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useLock } from '@/hooks/use-lock'
import { disableLock, setLockConfig, setLockPin } from '@/lib/lock-ipc'

import { SettingsRow, SettingsSection } from '../settings-row'

const IDLE_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '1 minute', value: 60_000 },
  { label: '5 minutes', value: 300_000 },
  { label: '15 minutes', value: 900_000 }
]

export function LockPrivacy() {
  const { status, refresh } = useLock()
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [removing, setRemoving] = useState(false)
  const [removePinValue, setRemovePinValue] = useState('')

  if (!status) return null

  const resetEnroll = () => {
    setStep('enter')
    setPin('')
    setConfirm('')
  }

  // Step 1: once 6 digits are entered, advance to the confirm step.
  const handlePinChange = (value: string) => {
    setPin(value)
    if (value.length === 6) setStep('confirm')
  }

  // Step 2: on the 6th confirm digit, validate the match and enroll.
  const handleConfirmChange = async (value: string) => {
    setConfirm(value)
    if (value.length !== 6) return
    if (value !== pin) {
      sileo.error({ title: 'PINs do not match' })
      resetEnroll()
      return
    }
    const { ok } = await setLockPin(pin)
    if (!ok) {
      sileo.error({
        title: 'Could not set PIN',
        description: 'A PIN already exists.'
      })
      resetEnroll()
      return
    }
    resetEnroll()
    await refresh()
    sileo.success({ title: 'Lock enabled' })
  }

  const removePin = async () => {
    const ok = await disableLock(removePinValue)
    if (!ok) {
      sileo.error({ title: 'Incorrect PIN' })
      setRemovePinValue('')
      return
    }
    setRemoving(false)
    setRemovePinValue('')
    await refresh()
    sileo.success({ title: 'Lock removed' })
  }

  const update = async (patch: Parameters<typeof setLockConfig>[0]) => {
    await setLockConfig(patch)
    await refresh()
  }

  return (
    <SettingsSection>
      {!status.hasPin ? (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Set a 6-digit PIN to lock Exodus. While locked, the UI and the local
            API are inaccessible, but background tasks keep running.
          </p>
          {step === 'enter' ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Enter a 6-digit PIN</span>
              <PinInput
                key="enter"
                value={pin}
                onChange={handlePinChange}
                autoFocus
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Confirm your PIN</span>
              <PinInput
                key="confirm"
                value={confirm}
                onChange={handleConfirmChange}
                autoFocus
              />
              <button
                type="button"
                onClick={resetEnroll}
                className="text-muted-foreground self-start text-xs hover:underline"
              >
                Start over
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {status.touchIdAvailable && (
            <SettingsRow label="Unlock with Touch ID">
              <Switch
                checked={status.config.touchIdEnabled}
                onCheckedChange={(v) => update({ touchIdEnabled: v })}
              />
            </SettingsRow>
          )}

          <SettingsRow label="Auto-lock when idle">
            <select
              className="bg-background border-border rounded-md border px-2 py-1 text-sm"
              value={status.config.idleTimeoutMs}
              onChange={(e) =>
                update({ idleTimeoutMs: Number(e.target.value) })
              }
            >
              {IDLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow label="Lock on app launch">
            <Switch
              checked={status.config.lockOnLaunch}
              onCheckedChange={(v) => update({ lockOnLaunch: v })}
            />
          </SettingsRow>

          <SettingsRow label="Lock on system sleep">
            <Switch
              checked={status.config.lockOnSystemSleep}
              onCheckedChange={(v) => update({ lockOnSystemSleep: v })}
            />
          </SettingsRow>

          {removing ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Current PIN</span>
              <PinInput value={removePinValue} onChange={setRemovePinValue} />
              <div className="flex gap-2">
                <Button variant="destructive" onClick={removePin}>
                  Confirm remove
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRemoving(false)
                    setRemovePinValue('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setRemoving(true)}
              className="self-start"
            >
              Remove lock
            </Button>
          )}
        </div>
      )}
    </SettingsSection>
  )
}
