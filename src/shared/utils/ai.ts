import type { Message as DBMessage } from '@shared/types/db'
import type {
  ChatMessage,
  ChatTools,
  CustomUIDataTypes
} from '@shared/types/message'
import type { UIMessagePart } from 'ai'
import { formatISO } from 'date-fns'

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt)
    }
  }))
}
