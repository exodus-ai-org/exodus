import { CoreAssistantMessage, CoreToolMessage, Message } from 'ai'

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage
type ResponseMessage = ResponseMessageWithoutId & { id: string }

export function sanitizeResponseMessages({
  messages,
  reasoning
}: {
  messages: Array<ResponseMessage>
  reasoning: string | undefined
}) {
  const toolResultIds: Array<string> = []

  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId)
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message

    if (typeof message.content === 'string') return message

    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true
    )

    if (reasoning) {
      // @ts-expect-error: reasoning message parts in sdk is wip
      sanitizedContent.push({ type: 'reasoning', reasoning })
    }

    return {
      ...message,
      content: sanitizedContent
    }
  })

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0
  )
}

export function getMostRecentUserMessage(messages: Array<Message>) {
  const userMessages = messages.filter((message) => message.role === 'user')
  return userMessages.at(-1)
}
