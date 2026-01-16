import { os } from '@orpc/server'
import { ErrorCode } from '@shared/constants/error-codes'
import { NotFoundError } from '@shared/errors'
import z from 'zod'
import {
  getDeepResearchById,
  getDeepResearchMessagesById
} from '../../db/queries'

// Get deep research messages by ID
export const getMessages = os
  .input(
    z.object({
      id: z.string()
    })
  )
  .handler(async ({ input }) => {
    return await getDeepResearchMessagesById({ id: input.id })
  })

// Get deep research result by ID
export const getResult = os
  .input(
    z.object({
      id: z.string()
    })
  )
  .handler(async ({ input }) => {
    const result = await getDeepResearchById({ id: input.id })
    if (!result) {
      throw new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Deep research not found',
        { id: input.id }
      )
    }
    return result
  })

// Note: The streaming endpoints (POST / and GET /sse) require special handling
// These involve SSE (Server-Sent Events) with client registration and
// real-time progress updates during the research process.
// See MIGRATION_SUMMARY.md for details on streaming challenges.
