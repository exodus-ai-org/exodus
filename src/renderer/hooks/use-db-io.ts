import { useState } from 'react'
import { sileo } from 'sileo'

import { downloadFile } from '@/lib/utils'
import {
  exportData as exportDataService,
  importAllData as importAllDataService,
  resetAllData as resetAllDataService
} from '@/services/db'

export function useDbIo() {
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const exportData = async () => {
    try {
      setExportLoading(true)
      const blob = await exportDataService()
      downloadFile(
        blob,
        `exodus-export-${new Date().toISOString().slice(0, 10)}.zip`
      )
      sileo.success({ title: 'Data exported successfully' })
    } catch (e) {
      sileo.error({
        title: 'Export failed',
        description: e instanceof Error ? e.message : 'Failed to export data.'
      })
    } finally {
      setExportLoading(false)
    }
  }

  const importData = async (file: File) => {
    try {
      setImportLoading(true)
      await importAllDataService(file)
      sileo.success({ title: 'Data imported successfully' })
    } catch (e) {
      sileo.error({
        title: 'Import failed',
        description: e instanceof Error ? e.message : 'Failed to import data.'
      })
    } finally {
      setImportLoading(false)
    }
  }

  const deleteData = async () => {
    try {
      setDeleteLoading(true)
      await resetAllDataService()
      sileo.success({ title: 'All data deleted' })
    } catch (e) {
      sileo.error({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Failed to delete data.'
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  return {
    exportLoading,
    importLoading,
    deleteLoading,
    importData,
    exportData,
    deleteData
  }
}
