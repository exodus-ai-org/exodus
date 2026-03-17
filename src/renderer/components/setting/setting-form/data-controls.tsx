import { Button } from '@/components/ui/button'
import { useDbIo } from '@/hooks/use-db-io'
import { Construction, Loader2 } from 'lucide-react'
import { SettingRow, SettingSection } from '../setting-row'

export function DataControls() {
  const { exportData, loading: dbIoLoading } = useDbIo()
  return (
    <SettingSection>
      <SettingRow
        label="Import Data"
        description="Import data from a backup file."
      >
        <Button disabled variant="outline">
          <Construction /> Import
        </Button>
      </SettingRow>
      <SettingRow
        label="Export Data"
        description="Export all your data to a file."
      >
        <Button variant="outline" disabled={dbIoLoading} onClick={exportData}>
          {dbIoLoading && <Loader2 className="animate-spin" />}
          Export Data
        </Button>
      </SettingRow>
      <SettingRow
        label="Delete Data"
        description="Permanently delete all your data."
      >
        <Button disabled variant="destructive">
          <Construction /> Delete
        </Button>
      </SettingRow>
    </SettingSection>
  )
}
