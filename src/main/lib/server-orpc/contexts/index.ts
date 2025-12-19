import type { S3Client } from '@aws-sdk/client-s3'
import { Setting } from '../../db/schema'

export interface OrpcContext {
  setting: Setting
  s3: S3Client
}
