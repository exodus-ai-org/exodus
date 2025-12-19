import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { os } from '@orpc/server'
import { z } from 'zod'

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

export const createUploadUrl = os
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
  .handler(async ({ input }) => {
    const key = `uploads/${Date.now()}-${input.filename}`

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: input.contentType
    })

    const url = await getSignedUrl(s3, command, {
      expiresIn: 60 * 5
    })

    return { url, key }
  })
