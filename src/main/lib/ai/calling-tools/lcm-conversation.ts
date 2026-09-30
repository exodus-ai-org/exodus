import { getChatById } from '../../db/queries'

const CONVERSATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u

/**
 * A conversation's id as the user hands it over (Copy conversation ID in the
 * sidebar), or null: the `chatId` columns are uuids, and anything else would
 * be an error from the database rather than an answer to the model.
 */
export function conversationIdOf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const id = value.trim().toLowerCase()
  return CONVERSATION_ID.test(id) ? id : null
}

export type ConversationTarget =
  | { chatId: string; problem?: undefined }
  | { chatId?: undefined; problem: string }

/**
 * Which conversation a recall tool reads: the one the model named, else the
 * one the tool is bound to. The model is not handed its own chat's id and
 * does not need it; an id it passes is another conversation's, given to it
 * by the user.
 */
export async function conversationTarget(
  named: string | undefined,
  bound: string | undefined
): Promise<ConversationTarget> {
  if (named === undefined || named.trim() === '') {
    return bound
      ? { chatId: bound }
      : {
          problem:
            'There is no conversation to read here: pass the conversation id the user gave you as chatId.'
        }
  }
  const chatId = conversationIdOf(named)
  if (!chatId) {
    return {
      problem: `"${named}" is not a conversation id. A conversation id looks like 5b30d978-ebe8-4da6-9e73-02c6fc42b771; ask the user to copy it from the conversation's menu in the sidebar. Omit chatId to read this conversation.`
    }
  }
  if (!(await getChatById({ id: chatId }))) {
    return {
      problem: `No conversation has the id ${chatId}. It may have been deleted, or the id was copied incompletely.`
    }
  }
  return { chatId }
}
