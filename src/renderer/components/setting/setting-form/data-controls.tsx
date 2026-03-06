import { Button } from '@/components/ui/button'
import { FormLabel } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { useDbIo } from '@/hooks/use-db-io'
import { Construction, Loader2 } from 'lucide-react'

export function DataControls() {
  const { exportData, loading: dbIoLoading } = useDbIo()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <FormLabel>Import Data</FormLabel>
        <Button disabled variant="outline">
          <Construction /> Import
        </Button>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <FormLabel>Export Data</FormLabel>
        <Button variant="outline" disabled={dbIoLoading} onClick={exportData}>
          {dbIoLoading && <Loader2 className="animate-spin" />}
          Export Data
        </Button>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <FormLabel>Delete Data</FormLabel>
        <Button disabled variant="destructive">
          <Construction /> Delete
        </Button>
      </div>
    </div>
  )
}
