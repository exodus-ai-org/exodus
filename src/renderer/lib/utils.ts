import type {
  Api,
  AssistantMessage,
  Provider,
  StopReason,
  ToolResultMessage,
  Usage,
  UserMessage
} from '@mariozechner/pi-ai'
import type { ChatMessage } from '@shared/types/chat'
import type { Message as DBMessage } from '@shared/types/db'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getMostRecentUserMessage(messages: Array<ChatMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user')
  return userMessages.at(-1)
}

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    fileReader.readAsDataURL(file)

    fileReader.onload = () => {
      resolve(fileReader.result as string)
    }

    fileReader.onerror = (error) => {
      reject(error)
    }
  })
}

export function convertToUIMessages(
  messages: Array<DBMessage>
): Array<ChatMessage> {
  return messages.map((dbMsg) => {
    if (dbMsg.role === 'user') {
      return {
        id: dbMsg.id,
        role: 'user' as const,
        content: dbMsg.content as UserMessage['content'],
        timestamp: new Date(dbMsg.createdAt).getTime()
      }
    }
    if (dbMsg.role === 'assistant') {
      const m = dbMsg as typeof dbMsg & {
        usage?: Usage
        api?: string
        provider?: string
        model?: string
        stopReason?: string
      }
      return {
        id: dbMsg.id,
        role: 'assistant' as const,
        content: dbMsg.content as AssistantMessage['content'],
        usage: m.usage as Usage,
        api: (m.api ?? '') as Api,
        provider: (m.provider ?? '') as Provider,
        model: m.model ?? '',
        stopReason: (m.stopReason ?? 'stop') as StopReason,
        timestamp: new Date(dbMsg.createdAt).getTime()
      }
    }
    // toolResult
    const m = dbMsg as typeof dbMsg & {
      toolCallId?: string
      toolName?: string
      isError?: boolean
    }
    return {
      id: dbMsg.id,
      role: 'toolResult' as const,
      toolCallId: m.toolCallId ?? '',
      toolName: m.toolName ?? '',
      content: dbMsg.content as ToolResultMessage['content'],
      isError: m.isError ?? false,
      timestamp: new Date(dbMsg.createdAt).getTime()
    }
  })
}

export function downloadFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
