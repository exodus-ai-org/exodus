import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import JSZip from 'jszip'
import { exportData, importData } from '../../db/queries'
import { importDataSchema } from '../schemas'

const dbIo = new Hono<{ Variables: Variables }>()

const tableNames = ['Chat', 'Message', 'Vote', 'Setting']

async function createZipFromBlobs(
  files: { filename: string; arraybuffer: ArrayBuffer }[]
) {
  const zip = new JSZip()

  files.forEach(({ filename, arraybuffer }) => {
    zip.file(filename, arraybuffer)
  })

  return zip
    .generateAsync({ type: 'nodebuffer' })
    .then((content) => {
      return content
    })
    .catch((error) => {
      throw error
    })
}

dbIo.post('/import', async (c) => {
  const body = await c.req.parseBody()
  const result = importDataSchema.safeParse({
    tableName: body['tableName'],
    file: body['file']
  })
  if (!result.success) {
    return c.text('Invalid request body', 400)
  }
  const { tableName, file } = result.data
  await importData(tableName, file)
  return c.json({ success: true })
})

dbIo.post('/export', async () => {
  const blobs = await Promise.all(
    tableNames.map(async (tableName) => {
      const blob = await exportData(tableName)
      return {
        arraybuffer: await (blob ?? new Blob([])).arrayBuffer(),
        filename: `${tableName}.csv`
      }
    })
  )

  const zipBlob = await createZipFromBlobs(blobs)

  return new Response(zipBlob, {
    headers: {
      'Content-Type': 'application/zip'
    }
  })
})

export default dbIo
