import z from 'zod'

// DB IO routes schemas
export const importDataSchema = z.object({
  tableName: z.string(),
  file: z.instanceof(File)
})
