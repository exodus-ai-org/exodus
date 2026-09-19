import {
  HardDriveDownload,
  HardDriveUpload,
  Loader2,
  ShieldCheck,
  Trash2
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { sileo } from 'sileo'
import useSWR from 'swr'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useDbIo } from '@/hooks/use-db-io'
import { useSettings } from '@/hooks/use-settings'
import {
  createBackupNow,
  type BackupInfo,
  type BackupStatus
} from '@/services/backup'

import { SettingsRow, SettingsSection } from '../settings-row'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function DataControls() {
  const { t } = useTranslation(['common', 'settings'])
  const { data: settings, updateSettings } = useSettings()
  const { data: backupStatus, mutate: mutateStatus } = useSWR<BackupStatus>(
    '/api/v1/backup/status'
  )
  const { data: backups, mutate: mutateBackups } = useSWR<BackupInfo[]>(
    '/api/v1/backup/list'
  )

  const {
    exportData,
    importData,
    deleteData,
    exportLoading,
    importLoading,
    deleteLoading
  } = useDbIo()

  const [backupLoading, setBackupLoading] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleBackupNow = async () => {
    try {
      setBackupLoading(true)
      await createBackupNow()
      mutateStatus()
      mutateBackups()
      sileo.success({
        title: t('settings:dataControls.backupNow.successToast')
      })
    } catch {
      sileo.error({ title: t('settings:dataControls.backupNow.errorToast') })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleToggleAutoBackup = async (enabled: boolean) => {
    if (!settings) return
    await updateSettings({ ...settings, autoBackup: enabled })
  }

  const handleImportConfirm = async () => {
    if (!selectedFile) return
    await importData(selectedFile)
    setImportDialogOpen(false)
    setSelectedFile(null)
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== 'DELETE') return
    await deleteData()
    setDeleteDialogOpen(false)
    setDeleteConfirmText('')
  }

  return (
    <SettingsSection>
      {/* Automatic Backups */}
      <SettingsRow
        label={t('settings:dataControls.autoBackup.label')}
        description={t('settings:dataControls.autoBackup.description')}
      >
        <Switch
          checked={backupStatus?.autoBackup ?? true}
          onCheckedChange={handleToggleAutoBackup}
        />
      </SettingsRow>

      <SettingsRow
        label={t('settings:dataControls.lastBackup.label')}
        description={
          backupStatus?.lastBackupAt
            ? formatDate(backupStatus.lastBackupAt)
            : t('settings:dataControls.lastBackup.none')
        }
      >
        <Button
          variant="outline"
          size="sm"
          disabled={backupLoading}
          onClick={handleBackupNow}
        >
          {backupLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ShieldCheck />
          )}
          {t('settings:dataControls.backupNow.button')}
        </Button>
      </SettingsRow>

      {/* Show recent backups */}
      {backups && backups.length > 0 && (
        <SettingsRow
          label={t('settings:dataControls.recentBackups.label')}
          description={t('settings:dataControls.recentBackups.description', {
            count: backups.length
          })}
          layout="vertical"
        >
          <div className="text-muted-foreground flex flex-col gap-1 text-xs">
            {backups.slice(0, 5).map((b) => (
              <div key={b.name} className="flex justify-between">
                <span>{b.name}</span>
                <span>{formatBytes(b.size)}</span>
              </div>
            ))}
          </div>
        </SettingsRow>
      )}

      {/* Export */}
      <SettingsRow
        label={t('settings:dataControls.export.label')}
        description={t('settings:dataControls.export.description')}
      >
        <Button variant="outline" disabled={exportLoading} onClick={exportData}>
          {exportLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <HardDriveDownload />
          )}
          {t('settings:dataControls.export.button')}
        </Button>
      </SettingsRow>

      {/* Import */}
      <SettingsRow
        label={t('settings:dataControls.import.label')}
        description={t('settings:dataControls.import.description')}
      >
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" disabled={importLoading}>
                {importLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <HardDriveUpload />
                )}
                {t('settings:dataControls.import.button')}
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t('settings:dataControls.import.label')}
              </DialogTitle>
              <DialogDescription>
                {t('settings:dataControls.import.dialogDescription')}
              </DialogDescription>
            </DialogHeader>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(false)}
              >
                {t('action.cancel')}
              </Button>
              <Button
                disabled={!selectedFile || importLoading}
                onClick={handleImportConfirm}
              >
                {importLoading && <Loader2 className="animate-spin" />}
                {t('settings:dataControls.import.confirmButton')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsRow>

      {/* Delete */}
      <SettingsRow
        label={t('settings:dataControls.delete.label')}
        description={t('settings:dataControls.delete.description')}
      >
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger
            render={
              <Button variant="destructive" disabled={deleteLoading}>
                {deleteLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                {t('settings:dataControls.delete.label')}
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t('settings:dataControls.delete.label')}
              </DialogTitle>
              <DialogDescription>
                {t('settings:dataControls.delete.dialogDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                <Trans
                  ns="settings"
                  i18nKey="dataControls.delete.confirmPrompt"
                >
                  Type <strong>DELETE</strong> to confirm:
                </Trans>
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setDeleteConfirmText('')
                }}
              >
                {t('action.cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                onClick={handleDeleteConfirm}
              >
                {deleteLoading && <Loader2 className="animate-spin" />}
                {t('settings:dataControls.delete.confirmButton')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsRow>
    </SettingsSection>
  )
}
