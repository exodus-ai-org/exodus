import { TEST_IDS } from '@shared/constants/test-ids'
import { useState } from 'react'
import { sileo } from 'sileo'

import { PinInput } from '@/components/lock/pin-input'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useLock } from '@/hooks/use-lock'
import { disableLock, setLockConfig, setLockPin } from '@/lib/lock-ipc'

import { SettingsRow, SettingsSection } from '../settings-row'
import { SettingsSelect } from '../settings-select'

const IDLE_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '1 minute', value: 60_000 },
  { label: '5 minutes', value: 300_000 },
  { label: '15 minutes', value: 900_000 }
]

function PinBlock({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}

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

  const handlePinChange = (value: string) => {
    setPin(value)
    if (value.length === 6) setStep('confirm')
  }

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
    <SettingsSection title="Lock & Privacy" plain>
      {!status.hasPin ? (
        <Card className="gap-4 p-5">
          <p className="text-muted-foreground text-sm">
            Set a 6-digit PIN to lock Exodus. While locked, the UI and the local
            API are inaccessible, but background tasks keep running.
          </p>
          {step === 'enter' ? (
            <PinBlock label="Enter a 6-digit PIN">
              <PinInput
                key="enter"
                value={pin}
                onChange={handlePinChange}
                autoFocus
                testId={TEST_IDS.lock.enablePinInput}
              />
            </PinBlock>
          ) : (
            <PinBlock label="Confirm your PIN">
              <PinInput
                key="confirm"
                value={confirm}
                onChange={handleConfirmChange}
                autoFocus
                testId={TEST_IDS.lock.confirmPinInput}
              />
              <Button
                variant="link"
                size="xs"
                onClick={resetEnroll}
                className="text-muted-foreground h-auto self-start p-0"
              >
                Start over
              </Button>
            </PinBlock>
          )}
        </Card>
      ) : (
        <>
          <SettingsSection>
            {status.touchIdAvailable && (
              <SettingsRow label="Unlock with Touch ID">
                <Switch
                  checked={status.config.touchIdEnabled}
                  onCheckedChange={(v) => update({ touchIdEnabled: v })}
                />
              </SettingsRow>
            )}

            <SettingsRow label="Auto-lock when idle">
              <SettingsSelect
                testId={TEST_IDS.lock.idleSelect}
                value={String(status.config.idleTimeoutMs)}
                onValueChange={(v) => update({ idleTimeoutMs: Number(v) })}
                options={IDLE_OPTIONS.map((o) => ({
                  value: String(o.value),
                  label: o.label
                }))}
              />
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

            <SettingsRow
              label="Remove lock"
              description="Turn off the app lock. Requires your current PIN."
            >
              <Button
                variant="destructive"
                size="sm"
                data-testid={TEST_IDS.lock.removeButton}
                onClick={() => setRemoving(true)}
              >
                Remove
              </Button>
            </SettingsRow>
          </SettingsSection>

          <AlertDialog
            open={removing}
            onOpenChange={(open) => {
              if (!open) {
                setRemoving(false)
                setRemovePinValue('')
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove lock?</AlertDialogTitle>
                <AlertDialogDescription>
                  Enter your current PIN to confirm. Exodus will no longer
                  require a PIN to open.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex justify-center py-1">
                <PinInput
                  value={removePinValue}
                  onChange={setRemovePinValue}
                  autoFocus
                  testId={TEST_IDS.lock.removePinInput}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={removePinValue.length !== 6}
                  onClick={removePin}
                >
                  Remove lock
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </SettingsSection>
  )
}
