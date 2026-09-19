import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'

import { downloadFile } from '@/lib/utils'
import {
  exportData as exportDataService,
  importAllData as importAllDataService,
  resetAllData as resetAllDataService
} from '@/services/db'

export function useDbIo() {
  const { t } = useTranslation('settings')
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
      sileo.success({ title: t('dataControls.export.successToast') })
    } catch (e) {
      sileo.error({
        title: t('dataControls.export.errorToast'),
        description:
          e instanceof Error
            ? e.message
            : t('dataControls.export.errorFallback')
      })
    } finally {
      setExportLoading(false)
    }
  }

  const importData = async (file: File) => {
    try {
      setImportLoading(true)
      await importAllDataService(file)
      sileo.success({ title: t('dataControls.import.successToast') })
    } catch (e) {
      sileo.error({
        title: t('dataControls.import.errorToast'),
        description:
          e instanceof Error
            ? e.message
            : t('dataControls.import.errorFallback')
      })
    } finally {
      setImportLoading(false)
    }
  }

  const deleteData = async () => {
    try {
      setDeleteLoading(true)
      await resetAllDataService()
      sileo.success({ title: t('dataControls.delete.successToast') })
    } catch (e) {
      sileo.error({
        title: t('dataControls.delete.errorToast'),
        description:
          e instanceof Error
            ? e.message
            : t('dataControls.delete.errorFallback')
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
