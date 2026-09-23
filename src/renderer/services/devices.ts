import { fetcher } from '@exodus/shared/utils/http'

export interface PairedDeviceInfo {
  id: string
  name: string
  createdAt: string
  lastSeenAt: string | null
}

export interface PairingInfo {
  /** Epoch ms. */
  expiresAt: number
  /** What the QR code encodes: `exodus://pair?h=&p=&c=&f=&n=`. */
  link: string
}

export interface DevicesState {
  devices: PairedDeviceInfo[]
  pairing: PairingInfo | null
  lanRunning: boolean
}

export const DEVICES_URL = '/api/v1/devices'

export const getDevices = () => fetcher<DevicesState>(DEVICES_URL)

export const openPairing = () =>
  fetcher<PairingInfo>(`${DEVICES_URL}/pairing`, { method: 'POST' })

export const cancelPairing = () =>
  fetcher(`${DEVICES_URL}/pairing`, { method: 'DELETE' })

export const revokeDevice = (id: string) =>
  fetcher(`${DEVICES_URL}/${id}`, { method: 'DELETE' })

export const resetDevices = () =>
  fetcher(`${DEVICES_URL}/reset`, { method: 'POST' })
