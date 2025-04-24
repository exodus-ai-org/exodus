import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useDbIo } from '@/hooks/use-db-io'
import { Construction, Loader2 } from 'lucide-react'

export function DataControls() {
  const { exportData, loading: dbIoLoading } = useDbIo()
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="opacity-80">Import Data</p>
        <Button disabled variant="outline">
          <Construction /> Import
        </Button>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <p className="opacity-80">Export Data</p>

        <Button
          variant="outline"
          disabled={dbIoLoading}
          onClick={exportData}
          className="cursor-pointer"
        >
          {dbIoLoading && <Loader2 className="animate-spin" />}
          Export
        </Button>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <p className="opacity-80">Delete Data</p>

        <Button disabled variant="destructive" className="cursor-pointer">
          <Construction /> Delete
        </Button>
      </div>
    </>
  )
}
