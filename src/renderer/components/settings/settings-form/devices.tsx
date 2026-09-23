import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { SmartphoneIcon, TabletIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
import { useFormat } from '@/lib/format'
import {
  cancelPairing,
  DEVICES_KEY,
  getDevices,
  openPairing,
  type PairedDeviceInfo,
  resetDevices,
  revokeDevice
} from '@/services/devices'

import {
  ENTER_UP,
  SettingsEmpty,
  SettingsIntro,
  SettingsItem
} from '../settings-kit'
import { SettingsRow, SettingsSection } from '../settings-row'
import { PairCard, PairingPanel } from './devices-pairing'

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
    <SettingsItem
      data-testid={TEST_IDS.devices.deviceRow}
      className={ENTER_UP}
      icon={
        /ipad|tablet/iu.test(device.name) ? <TabletIcon /> : <SmartphoneIcon />
      }
      title={<span className="truncate">{device.name}</span>}
      description={
        <p className="truncate text-xs">
          {pairedOn} · {lastSeen}
        </p>
      }
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid={TEST_IDS.devices.revokeButton}
          onClick={onRevoke}
        >
          {t('devices.row.revoke')}
        </Button>
      }
    />
  )
}

/**
 * Settings → Integrations → Devices. Nothing on the LAN can use Exodus until a
 * device has been paired from this page: "Pair a device" opens a two-minute
 * window and shows its QR code (see src/main/lib/lan/). The page polls while a
 * window is open — that is how it learns the phone has paired.
 *
 * Top to bottom: the pairing card (an invitation, or the steps + QR code while
 * a window is open), the paired devices, then "Reset all" on its own row, away
 * from the primary action.
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

  // The QR code vanishing is the only other sign a phone has paired, so say
  // so: a device that was not there while a window was open is the new one.
  const lastSeen = useRef<{ ids: Set<string>; pairing: boolean } | null>(null)
  useEffect(() => {
    if (!data) return
    const previous = lastSeen.current
    const added = previous?.pairing
      ? data.devices.find((device) => !previous.ids.has(device.id))
      : undefined
    if (added) {
      // The name goes in the description: sileo capitalises every word of a
      // title, which turns "iPhone" into "IPhone".
      sileo.success({
        title: t('devices.toast.pairedTitle'),
        description: added.name
      })
    }
    lastSeen.current = {
      ids: new Set(data.devices.map((device) => device.id)),
      pairing: data.pairing !== null
    }
  }, [data, t])

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
      <SettingsIntro>{t('devices.description')}</SettingsIntro>

      {pairing ? (
        <PairingPanel pairing={pairing} onCancel={() => run(cancelPairing)} />
      ) : (
        <PairCard onPair={() => run(openPairing)} />
      )}

      {data && (
        <SettingsSection title={t('devices.heading')}>
          {data.devices.length === 0 ? (
            <SettingsEmpty
              icon={SmartphoneIcon}
              title={t('devices.empty')}
              description={t('devices.emptyHint')}
            />
          ) : (
            data.devices.map((device) => (
              <DeviceRow
                key={device.id}
                device={device}
                onRevoke={() => setRevoking(device)}
              />
            ))
          )}
        </SettingsSection>
      )}

      <SettingsSection>
        <SettingsRow
          label={t('devices.reset.label')}
          description={t('devices.reset.rowDescription')}
        >
          <Button
            type="button"
            variant="destructive"
            data-testid={TEST_IDS.devices.resetButton}
            onClick={() => setResetting(true)}
          >
            {t('devices.reset.button')}
          </Button>
        </SettingsRow>
      </SettingsSection>

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
