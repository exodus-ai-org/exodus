import { z } from 'zod'

export const uploadToS3Schema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  fileSize: z.number().optional()
})

export const getPresignedUrlSchema = z.object({
  key: z.string()
})
