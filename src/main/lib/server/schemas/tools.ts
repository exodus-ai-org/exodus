import z from 'zod'

// Tools routes schemas
export const markdownToPdfSchema = z.object({
  markdown: z.string()
})
