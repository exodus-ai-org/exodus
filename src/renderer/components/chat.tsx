import { QUICK_CHAT_KEY } from '@shared/constants/misc'
import { BASE_URL } from '@shared/constants/systems'
import { Attachment, ChatMessage } from '@shared/types/chat'
import type { Project } from '@shared/types/db'
import { IpcRendererEvent } from 'electron'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { sileo } from 'sileo'
import { mutate } from 'swr'
import useSWR from 'swr'
import { v4 as uuidV4 } from 'uuid'

import { useChat } from '@/hooks/use-chat'
import { bringWindowToFront, subscribeQuickChatInput } from '@/lib/ipc'
import { advancedToolsAtom } from '@/stores/chat'
import { chatInputAtom, chatStatusAtom, chatStopFnAtom } from '@/stores/input'

import Messages from './messages'
import MultimodalInput from './multimodel-input'

function ProjectBreadcrumb({ projectId }: { projectId: string }) {
  const { data: project } = useSWR<Project & { chatCount: number }>(
    `/api/project/${projectId}`
  )

  if (!project) return null

  return (
    <div className="flex items-center px-4 pt-3 pb-1">
      <Link
        to={`/project/${projectId}`}
        className="text-muted-foreground hover:text-foreground text-xs transition-colors"
      >
        {project.name} /
      </Link>
    </div>
  )
}

interface Props {
  id: string
  initialMessages: ChatMessage[]
  projectId?: string
}

export function Chat({ id, initialMessages, projectId }: Props) {
  const quickChat = window.localStorage.getItem(QUICK_CHAT_KEY)
  const advancedTools = useAtomValue(advancedToolsAtom)
  const advancedToolsRef = useRef(advancedTools)
  advancedToolsRef.current = advancedTools
  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId

  const setChatInput = useSetAtom(chatInputAtom)
  const setChatStatus = useSetAtom(chatStatusAtom)
  const setChatStop = useSetAtom(chatStopFnAtom)

  const [attachments, setAttachments] = useState<Attachment[]>([])

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    lastUsage
  } = useChat({
    id,
    api: `${BASE_URL}/api/chat`,
    messages: initialMessages,
    generateId: uuidV4,
    prepareBody: ({ id, messages, body }) => ({
      ...body,
      id,
      messages,
      advancedTools: advancedToolsRef.current,
      projectId: projectIdRef.current
    }),
    onFinish: () => {
      mutate('/api/history')
    },
    onError: (e) => {
      sileo.error({
        title: 'Something went wrong',
        description:
          e instanceof Error
            ? e.message
            : 'An error occurred, please try again!'
      })
    }
  })

  useEffect(() => {
    setChatStatus(status)
  }, [status, setChatStatus])

  // Store stop in a ref to avoid re-renders from function identity changes
  const stopRef = useRef(stop)
  stopRef.current = stop
  const stableStop = useCallback(() => stopRef.current(), [])
  useEffect(() => {
    setChatStop(() => stableStop)
  }, [stableStop, setChatStop])

  useEffect(() => {
    if (quickChat) {
      setChatInput(quickChat)
    }
  }, [quickChat, setChatInput])

  useEffect(() => {
    return () => {
      subscribeQuickChatInput(async (_: IpcRendererEvent, text: string) => {
        await bringWindowToFront()
        window.localStorage.setItem(QUICK_CHAT_KEY, text)
        window.location.href = '/'
      })
    }
  }, [id])

  useEffect(() => {
    if (quickChat) {
      window.history.replaceState({}, '', `/chat/${id}`)
      sendMessage({ text: quickChat })
      setChatInput('')
      window.localStorage.removeItem(QUICK_CHAT_KEY)
    }
  }, [id, quickChat, sendMessage, setChatInput])

  return (
    <>
      {projectId && <ProjectBreadcrumb projectId={projectId} />}
      <Messages status={status} messages={messages} regenerate={regenerate} />
      <MultimodalInput
        chatId={id}
        attachments={attachments}
        setAttachments={setAttachments}
        messages={messages}
        setMessages={setMessages}
        sendMessage={sendMessage}
        lastUsage={lastUsage}
      />
    </>
  )
}
