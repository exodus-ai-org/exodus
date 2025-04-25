import { FormLabel } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { SystemInfo as SystemInfoType } from '@shared/types/system-info'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export function SystemInfo() {
  const [systemInfo, setSystemInfo] = useState<SystemInfoType | null>(null)

  const getSystemInfo = useCallback(async () => {
    if (systemInfo !== null) return

    try {
      const result: SystemInfoType =
        await window.electron.ipcRenderer.invoke('get-system-info')
      setSystemInfo(result)
    } catch {
      toast.error('Failed to retrieve system information.')
    }
  }, [systemInfo])

  useEffect(() => {
    getSystemInfo()
  }, [getSystemInfo])

  if (systemInfo === null) return null
  return (
    <>
      {Object.keys(systemInfo).map((label) => (
        <Fragment key={label}>
          <div className="flex items-center justify-between">
            <FormLabel>{label}</FormLabel>
            <span className="text-ring text-sm">{systemInfo[label]}</span>
          </div>
          <Separator />
        </Fragment>
      ))}
    </>
  )
}
