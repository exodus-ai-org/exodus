import z from 'zod'

// Deep Research routes schemas
export const createDeepResearchSchema = z.object({
  deepResearchId: z.string(),
  query: z.string()
})
