import { CoreAssistantMessage, CoreToolMessage, Message } from 'ai'

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage
type ResponseMessage = ResponseMessageWithoutId & { id: string }

export function getMostRecentUserMessage(messages: Array<Message>) {
  const userMessages = messages.filter((message) => message.role === 'user')
  return userMessages.at(-1)
}

export function getTrailingMessageId({
  messages
}: {
  messages: Array<ResponseMessage>
}): string | null {
  const trailingMessage = messages.at(-1)

  if (!trailingMessage) return null

  return trailingMessage.id
}
