import {
  HardDriveDownload,
  HardDriveUpload,
  Loader2,
  ShieldCheck,
  Trash2
} from 'lucide-react'
import { useRef, useState } from 'react'
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
  const { data: settings, updateSettings } = useSettings()
  const { data: backupStatus, mutate: mutateStatus } =
    useSWR<BackupStatus>('/api/backup/status')
  const { data: backups, mutate: mutateBackups } =
    useSWR<BackupInfo[]>('/api/backup/list')

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
      sileo.success({ title: 'Backup created' })
    } catch {
      sileo.error({ title: 'Backup failed' })
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
        label="Automatic Backups"
        description="Back up your data daily at 3:00 AM. Backups are stored locally in ~/.exodus/backups/."
      >
        <Switch
          checked={backupStatus?.autoBackup ?? true}
          onCheckedChange={handleToggleAutoBackup}
        />
      </SettingsRow>

      <SettingsRow
        label="Last Backup"
        description={
          backupStatus?.lastBackupAt
            ? formatDate(backupStatus.lastBackupAt)
            : 'No backups yet'
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
          Back Up Now
        </Button>
      </SettingsRow>

      {/* Show recent backups */}
      {backups && backups.length > 0 && (
        <SettingsRow
          label="Recent Backups"
          description={`${backups.length} backup(s) stored`}
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
        label="Export Data"
        description="Download a portable copy of your conversations, settings, and other data as a ZIP archive."
      >
        <Button variant="outline" disabled={exportLoading} onClick={exportData}>
          {exportLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <HardDriveDownload />
          )}
          Export
        </Button>
      </SettingsRow>

      {/* Import */}
      <SettingsRow
        label="Import Data"
        description="Restore from a previously exported ZIP archive. This will replace all existing data."
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
                Import
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Data</DialogTitle>
              <DialogDescription>
                Select a previously exported ZIP file. This will replace all
                existing conversations and data. A backup will be created
                automatically before import.
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
                Cancel
              </Button>
              <Button
                disabled={!selectedFile || importLoading}
                onClick={handleImportConfirm}
              >
                {importLoading && <Loader2 className="animate-spin" />}
                Replace & Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsRow>

      {/* Delete */}
      <SettingsRow
        label="Delete All Data"
        description="Permanently erase all conversations, memories, and research data. Your settings will be preserved."
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
                Delete All Data
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete All Data</DialogTitle>
              <DialogDescription>
                This will permanently delete all your conversations, memories,
                research data, and uploaded documents. Your settings and API
                keys will be preserved. A backup will be created before
                deletion.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                Type <strong>DELETE</strong> to confirm:
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
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                onClick={handleDeleteConfirm}
              >
                {deleteLoading && <Loader2 className="animate-spin" />}
                Delete Everything
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsRow>
    </SettingsSection>
  )
}
