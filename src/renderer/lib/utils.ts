import type {
  Api,
  AssistantMessage,
  Provider,
  StopReason,
  ToolResultMessage,
  UserMessage
} from '@mariozechner/pi-ai'
import type { ChatMessage } from '@shared/types/chat'
import type { Message as DBMessage } from '@shared/types/db'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    fileReader.readAsDataURL(file)
    fileReader.onload = () => resolve(fileReader.result as string)
    fileReader.onerror = (error) => reject(error)
  })
}

export function convertToUIMessages(
  messages: Array<DBMessage>
): Array<ChatMessage> {
  return messages.map((dbMsg) => {
    const timestamp = new Date(dbMsg.createdAt).getTime()

    if (dbMsg.role === 'user') {
      return {
        id: dbMsg.id,
        role: 'user' as const,
        content: dbMsg.content as UserMessage['content'],
        timestamp
      }
    }
    if (dbMsg.role === 'assistant') {
      return {
        id: dbMsg.id,
        role: 'assistant' as const,
        content: dbMsg.content as AssistantMessage['content'],
        usage: dbMsg.usage!,
        api: (dbMsg.api ?? '') as Api,
        provider: (dbMsg.provider ?? '') as Provider,
        model: dbMsg.model ?? '',
        stopReason: (dbMsg.stopReason ?? 'stop') as StopReason,
        errorMessage: dbMsg.errorMessage ?? undefined,
        timestamp
      }
    }
    return {
      id: dbMsg.id,
      role: 'toolResult' as const,
      toolCallId: dbMsg.toolCallId ?? '',
      toolName: dbMsg.toolName ?? '',
      content: dbMsg.content as ToolResultMessage['content'],
      details: dbMsg.details,
      isError: dbMsg.isError ?? false,
      timestamp
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
