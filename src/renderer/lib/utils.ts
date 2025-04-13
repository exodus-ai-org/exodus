import { BASE_URL } from '@shared/constants'
import type { Message as DBMessage } from '@shared/types/db'
import type { Attachment, Message, UIMessage } from 'ai'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ApplicationError extends Error {
  info: string
  status: number
}

export const fetcher = async (path: string) => {
  const res = await fetch(BASE_URL + path)

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.'
    ) as ApplicationError

    error.info = await res.json()
    error.status = res.status

    throw error
  }

  return res.json()
}

export function getMostRecentUserMessage(messages: Array<Message>) {
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
): Array<UIMessage> {
  return messages.map((message) => ({
    id: message.id,
    parts: message.parts as UIMessage['parts'],
    role: message.role as UIMessage['role'],
    content: '',
    createdAt: message.createdAt,
    experimental_attachments: (message.attachments as Array<Attachment>) ?? []
  }))
}
