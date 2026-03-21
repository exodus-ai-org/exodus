import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import JSZip from 'jszip'

import { exportData, importData } from '../../db/queries'
import { ChatSDKError } from '../errors'
import { importDataSchema } from '../schemas/db-io'
import {
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'
import { bufferToArrayBuffer } from '../utils/helpers'

const dbIo = new Hono<{ Variables: Variables }>()

const tableNames = ['Chat', 'Message', 'Vote', 'Setting']

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
    throw new ChatSDKError(
      'bad_request:database',
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
    'database',
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

export default dbIo
