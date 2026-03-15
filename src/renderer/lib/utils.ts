import { ChatMessage, MessagePart } from '@shared/types/chat'
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
  return messages.map((message) => ({
    id: message.id,
    parts: message.parts as MessagePart[],
    role: message.role as 'user' | 'assistant'
  }))
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
