import z from 'zod'

// Audio routes schemas
export const speechSchema = z.object({
  text: z.string()
})
