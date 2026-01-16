import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { os } from '@orpc/server'
import { ErrorCode } from '@shared/constants/error-codes'
import { ServiceError } from '@shared/errors'
import { z } from 'zod'
import { withS3 } from '../middlewares/with-s3'

/**
 * Create presigned S3 upload URL
 * Uses S3 configuration from database settings
 * S3 client is automatically cached and invalidated when settings change
 */
export const createUploadUrl = os
  .use(withS3)
  .input(
    z.object({
      filename: z.string(),
      contentType: z.string()
    })
  )
  .output(
    z.object({
      url: z.string(),
      key: z.string()
    })
  )
  .handler(async ({ input, context }) => {
    const { s3 } = context
    const key = `uploads/${Date.now()}-${input.filename}`

    try {
      const command = new PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        ContentType: input.contentType
      })

      const url = await getSignedUrl(s3.client, command, {
        expiresIn: 60 * 5 // 5 minutes
      })

      return { url, key }
    } catch (error) {
      throw new ServiceError(
        ErrorCode.SERVICE_S3_PRESIGN_FAILED,
        error instanceof Error ? error.message : undefined,
        {
          bucket: s3.bucket,
          key,
          originalError: error instanceof Error ? error.name : 'Unknown'
        }
      )
    }
  })
