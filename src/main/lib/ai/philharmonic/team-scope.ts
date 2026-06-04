// src/main/lib/ai/philharmonic/team-scope.ts
import { getConversationById } from '../../db/conversation-queries'
import { getAgentById } from '../../db/philharmonic-queries'

/**
 * Compute the team scope for KB retrieval inside a Group.
 *
 * Returns the unique non-null teamIds of every employee currently in the
 * conversation. General docs (teamId IS NULL) are always admitted by the
 * underlying query, so callers don't need to add them here.
 *
 * Returns an empty array when the conversation has no members — at that point
 * only General docs are reachable, which is the safe default for a brand-new
 * Group.
 */
export async function computeAllowedTeamIds(
  conversationId: string
): Promise<string[]> {
  const convo = await getConversationById(conversationId)
  const memberIds = (convo?.memberAgentIds as string[] | null) ?? []
  if (memberIds.length === 0) return []
  const agents = await Promise.all(memberIds.map((id) => getAgentById(id)))
  const teamIds = new Set<string>()
  for (const a of agents) {
    if (a?.teamId) teamIds.add(a.teamId)
  }
  return [...teamIds]
}
