import { downloadFile } from '@/lib/utils'
import { exportData as exportDataService } from '@/services/db'
import { useState } from 'react'
import { sileo } from 'sileo'

export function useDbIo() {
  const [loading, setLoading] = useState(false)

  const importData = async (blob: Blob) => {
    console.log(blob)
  }

  const exportData = async () => {
    try {
      setLoading(true)
      const blob = await exportDataService()
      downloadFile(blob, 'exodus-archive.zip')
    } catch (e) {
      sileo.error({
        title: 'Export failed',
        description:
          e instanceof Error
            ? e.message
            : 'Failed to export data from database.'
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteData = async () => {}

  return {
    loading,
    importData,
    exportData,
    deleteData
  }
}
