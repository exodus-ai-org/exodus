import { ErrorCode } from '@shared/constants/error-codes'
import { DatabaseError } from '@shared/errors/app-error'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import JSZip from 'jszip'

import { createAutoBackup } from '../../backup'
import { exportData, importData, resetAllData } from '../../db/queries'
import { importDataSchema } from '../schemas/db-io'
import {
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'
import { bufferToArrayBuffer } from '../utils/helpers'

const dbIo = new Hono<{ Variables: Variables }>()

const tableNames = [
  'chat',
  'message',
  'vote',
  'settings',
  'memory',
  'session_summary',
  'deep_research',
  'deep_research_message'
]

async function createZipFromBlobs(
  files: { filename: string; arraybuffer: ArrayBuffer }[]
) {
  const zip = new JSZip()

  files.forEach(({ filename, arraybuffer }) => {
    zip.file(filename, arraybuffer)
  })

  try {
    return await zip.generateAsync({ type: 'nodebuffer' })
  } catch (error) {
    throw new DatabaseError(
      ErrorCode.DB_QUERY_FAILED,
      error instanceof Error ? error.message : 'Failed to create zip file'
    )
  }
}

dbIo.post('/import', async (c) => {
  const body = await c.req.parseBody()
  const { tableName, file } = validateSchema<{ tableName: string; file: File }>(
    importDataSchema,
    {
      tableName: body['tableName'],
      file: body['file']
    },
    'Invalid request body'
  )

  await handleDatabaseOperation(
    () => importData(tableName, file),
    'Failed to import data'
  )

  return successResponse(c, { success: true })
})

dbIo.post('/export', async () => {
  const blobs = await Promise.all(
    tableNames.map(async (tableName) => {
      const blob = await handleDatabaseOperation(
        () => exportData(tableName),
        `Failed to export ${tableName}`
      )
      return {
        arraybuffer: await (blob ?? new Blob([])).arrayBuffer(),
        filename: `${tableName}.csv`
      }
    })
  )

  const zipBlob = await createZipFromBlobs(blobs)

  return new Response(bufferToArrayBuffer(zipBlob), {
    headers: {
      'Content-Type': 'application/zip'
    }
  })
})

// Full import: receives a ZIP, clears data, imports all CSVs
dbIo.post('/import-all', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  if (!(file instanceof File)) {
    throw new DatabaseError(ErrorCode.DB_QUERY_FAILED, 'No file uploaded')
  }

  // Safety backup before import
  await createAutoBackup()

  const zip = await JSZip.loadAsync(await file.arrayBuffer())

  // Clear existing data
  await resetAllData()

  // Import each CSV found in the ZIP
  for (const [fileName, zipEntry] of Object.entries(zip.files)) {
    if (!fileName.endsWith('.csv') || zipEntry.dir) continue
    const tableName = fileName.replace('.csv', '')
    if (tableName === 'settings') continue // Don't overwrite settings
    const csvBlob = new Blob([await zipEntry.async('arraybuffer')])
    await importData(tableName, csvBlob)
  }

  return successResponse(c, { success: true })
})

// Reset: delete all data except settings
dbIo.delete('/reset', async (c) => {
  await createAutoBackup()
  await handleDatabaseOperation(() => resetAllData(), 'Failed to reset data')
  return successResponse(c, { success: true })
})

export default dbIo
