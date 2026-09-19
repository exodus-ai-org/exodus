import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'
import useSWR from 'swr'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/use-clipboard'
import { useFormat } from '@/lib/format'
import {
  cancelPairing,
  DEVICES_KEY,
  getDevices,
  openPairing,
  type PairedDeviceInfo,
  type PairingInfo,
  resetDevices,
  revokeDevice
} from '@/services/devices'

import { SettingsSection } from '../settings-row'

/** Seconds until `expiresAt`, ticking once a second. */
function useSecondsLeft(expiresAt: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return Math.max(0, Math.ceil((expiresAt - now) / 1000))
}

function PairingPanel({
  pairing,
  onCancel
}: {
  pairing: PairingInfo
  onCancel: () => void
}) {
  const { t } = useTranslation('settings')
  const { copied, handleCopy } = useClipboard()
  const secondsLeft = useSecondsLeft(pairing.expiresAt)

  return (
    <SettingsSection title={t('devices.pairing.title')}>
      <div className="flex flex-col items-center gap-4">
        <p className="text-muted-foreground text-center text-sm">
          {t('devices.pairing.instructions')}
        </p>
        {/* Always dark-on-light: a QR code inverted for dark mode won't scan. */}
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG
            value={pairing.link}
            size={224}
            marginSize={2}
            data-testid={TEST_IDS.devices.qrCode}
          />
        </div>
        <p className="text-muted-foreground text-sm tabular-nums">
          {t('devices.pairing.expiresIn', { seconds: secondsLeft })}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid={TEST_IDS.devices.copyLinkButton}
            onClick={() => handleCopy(pairing.link)}
          >
            {copied === pairing.link
              ? t('devices.pairing.linkCopied')
              : t('devices.pairing.copyLink')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            data-testid={TEST_IDS.devices.cancelPairingButton}
            onClick={onCancel}
          >
            {t('devices.pairing.cancel')}
          </Button>
        </div>
      </div>
    </SettingsSection>
  )
}

function DeviceRow({
  device,
  onRevoke
}: {
  device: PairedDeviceInfo
  onRevoke: () => void
}) {
  const { t } = useTranslation('settings')
  const format = useFormat()
  const pairedOn = t('devices.row.pairedOn', {
    date: format.dateTime(new Date(device.createdAt), { dateStyle: 'medium' })
  })
  const lastSeen = device.lastSeenAt
    ? t('devices.row.lastSeen', {
        date: format.relativeTime(new Date(device.lastSeenAt))
      })
    : t('devices.row.neverSeen')

  return (
    <div
      data-testid={TEST_IDS.devices.deviceRow}
      className="flex items-center justify-between gap-4"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{device.name}</p>
        <p className="text-muted-foreground text-xs">{pairedOn}</p>
        <p className="text-muted-foreground text-xs">{lastSeen}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid={TEST_IDS.devices.revokeButton}
        onClick={onRevoke}
      >
        {t('devices.row.revoke')}
      </Button>
    </div>
  )
}

/**
 * Settings → Integrations → Devices. Nothing on the LAN can use Exodus until a
 * device has been paired from this page: "Pair a device" opens a two-minute
 * window and shows its QR code (see src/main/lib/lan/). The page polls while a
 * window is open — that is how it learns the phone has paired.
 */
export function Devices() {
  const { t } = useTranslation('settings')
  const [polling, setPolling] = useState(false)
  // Confirmations are controlled from here (the house pattern): the dialog's
  // action is a plain button, so closing it is this component's job.
  const [revoking, setRevoking] = useState<PairedDeviceInfo | null>(null)
  const [resetting, setResetting] = useState(false)
  const { data, mutate } = useSWR(DEVICES_KEY, getDevices, {
    refreshInterval: polling ? 1500 : 0
  })
  const pairing = data?.pairing ?? null
  useEffect(() => setPolling(pairing !== null), [pairing])

  async function run(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (error) {
      sileo.error({
        title: t('devices.toast.failedTitle'),
        description: error instanceof Error ? error.message : String(error)
      })
    } finally {
      await mutate()
    }
  }

  return (
    <>
      <p className="text-muted-foreground -mt-4 text-sm">
        {t('devices.description')}
      </p>

      <SettingsSection title={t('devices.heading')}>
        {data?.devices.length === 0 && (
          <p className="text-muted-foreground text-sm">{t('devices.empty')}</p>
        )}
        {data?.devices.map((device) => (
          <DeviceRow
            key={device.id}
            device={device}
            onRevoke={() => setRevoking(device)}
          />
        ))}
        <div className="flex gap-2">
          {!pairing && (
            <Button
              type="button"
              data-testid={TEST_IDS.devices.pairButton}
              onClick={() => run(openPairing)}
            >
              {t('devices.pair')}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            data-testid={TEST_IDS.devices.resetButton}
            onClick={() => setResetting(true)}
          >
            {t('devices.reset.button')}
          </Button>
        </div>
      </SettingsSection>

      {pairing && (
        <PairingPanel pairing={pairing} onCancel={() => run(cancelPairing)} />
      )}

      <AlertDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('devices.revokeDialog.title', { name: revoking?.name ?? '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('devices.revokeDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('devices.pairing.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const id = revoking?.id
                setRevoking(null)
                if (id) void run(() => revokeDevice(id))
              }}
            >
              {t('devices.revokeDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetting} onOpenChange={setResetting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('devices.reset.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('devices.reset.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('devices.pairing.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setResetting(false)
                void run(resetDevices)
              }}
            >
              {t('devices.reset.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
