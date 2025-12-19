import { os } from '@orpc/server'
import JSZip from 'jszip'
import z from 'zod'
import {
  exportData as exportDataFromDatabase,
  importData as importDataFromDatabase
} from '../../db/queries'

export interface TableFile {
  filename: string
  arraybuffer: ArrayBuffer
}

const ImportDataSchema = z.array(
  z.object({
    tableName: z.string(),
    file: z.instanceof(File)
  })
)

const tableNames = ['Chat', 'Message', 'Vote', 'Setting']

async function createZipFromBlobs(files: TableFile[]) {
  const zip = new JSZip()

  files.forEach(({ filename, arraybuffer }) => {
    zip.file(filename, arraybuffer)
  })

  return zip.generateAsync({ type: 'nodebuffer' })
}

export const exportData = os.handler(async () => {
  const blobs = await Promise.all(
    tableNames.map(async (tableName) => {
      const blob = await exportDataFromDatabase(tableName)

      return {
        arraybuffer: await (blob ?? new Blob([])).arrayBuffer(),
        filename: `${tableName}.csv`
      }
    })
  )

  const zipBlob = await createZipFromBlobs(blobs)
  return zipBlob
})

export const importData = os
  .input(ImportDataSchema)
  .handler(async ({ input }) => {
    await Promise.all(
      input.map((item) => importDataFromDatabase(item.tableName, item.file))
    )
  })
