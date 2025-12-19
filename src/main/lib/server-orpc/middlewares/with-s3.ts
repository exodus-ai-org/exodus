import { S3Client } from '@aws-sdk/client-s3'
import { os } from '@orpc/server'
import { createS3Client } from '../utils'

let cachedClient: S3Client | null = null
let cachedVersion: string | null = null

export const withS3 = os.middleware(async ({ context, next }) => {
  const { setting } = context

  const version = setting.updatedAt.toISOString()

  if (cachedClient && cachedVersion === version) {
    return next({
      context: {
        s3: cachedClient
      }
    })
  }

  const client = createS3Client(setting)

  cachedClient = client
  cachedVersion = version

  return next({
    context: {
      s3: client
    }
  })
})
