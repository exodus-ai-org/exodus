import { downloadFile } from '@/lib/utils'
import { BASE_URL } from '@shared/constants'
import { useState } from 'react'
import { toast } from 'sonner'

export function useDbIo() {
  const [loading, setLoading] = useState(false)

  const importData = async (blob: Blob) => {
    console.log(blob)
  }

  const exportData = async () => {
    try {
      setLoading(true)
      const response = await fetch(BASE_URL + '/api/db-io/export', {
        method: 'POST'
      })
      const blob = await response.blob()
      console.log(blob)
      downloadFile(blob, 'export.zip')
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to export data from database.'
      )
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    importData,
    exportData
  }
}
