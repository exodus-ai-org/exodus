import { fetcher } from '@shared/utils/http'

export interface BackupInfo {
  name: string
  size: number
  createdAt: string
}

export interface BackupStatus {
  autoBackup: boolean
  lastBackupAt: string | null
}

export const listBackups = () => fetcher<BackupInfo[]>('/api/backup/list')

export const getBackupStatus = () => fetcher<BackupStatus>('/api/backup/status')

export const createBackupNow = () =>
  fetcher<{ filePath: string }>('/api/backup/now', { method: 'POST' })
