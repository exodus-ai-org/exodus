import { z } from 'zod'

export const structuredInstructionsSchema = z.object({
  tone: z.string().optional(),
  role: z.string().optional(),
  responseFormat: z.string().optional(),
  constraints: z.string().optional()
})

export type StructuredInstructions = z.infer<
  typeof structuredInstructionsSchema
>

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  structuredInstructions: structuredInstructionsSchema.optional()
})

export const updateProjectSchema = createProjectSchema.partial()
