import { S3Client } from '@aws-sdk/client-s3'
import type { Setting } from '@shared/types/db'

export function createS3Client(setting: Setting) {
  if (!setting.s3) {
    throw new Error('S3 configuration is missing')
  }

  const { region, accessKeyId, secretAccessKey } = setting.s3

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 configuration is incomplete')
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  })
}
