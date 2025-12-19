import { S3Client } from '@aws-sdk/client-s3'

export function createS3Client(setting: {
  s3AccessKeyId: string
  s3SecretAccessKey: string
  s3Region: string
  s3Endpoint?: string | null
}) {
  return new S3Client({
    region: setting.s3Region,
    endpoint: setting.s3Endpoint ?? undefined,
    credentials: {
      accessKeyId: setting.s3AccessKeyId,
      secretAccessKey: setting.s3SecretAccessKey
    }
  })
}
