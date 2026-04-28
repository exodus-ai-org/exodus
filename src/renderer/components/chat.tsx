import { QUICK_CHAT_KEY } from '@shared/constants/misc'
import { BASE_URL } from '@shared/constants/systems'
import { Attachment, ChatMessage } from '@shared/types/chat'
import type { Project } from '@shared/types/db'
import { useSetAtom } from 'jotai'
import { useAtomCallback } from 'jotai/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { sileo } from 'sileo'
import { mutate } from 'swr'
import useSWR from 'swr'
import { v4 as uuidV4 } from 'uuid'

import { useChat } from '@/hooks/use-chat'
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
  chatTitle: string
}

export function Chat({ id, initialMessages, projectId, chatTitle }: Props) {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  // Read once on mount — quick-chat hand-off only fires for the first render of a fresh chat.
  const quickChatRef = useRef<string | null>(null)
  if (quickChatRef.current === null) {
    quickChatRef.current = window.localStorage.getItem(QUICK_CHAT_KEY)
  }
  // advancedTools is only read inside prepareBody (a callback fired on send),
  // so we don't need to subscribe — useAtomCallback gets the latest value
  // lazily without triggering a Chat re-render on every tool toggle, which
  // would otherwise cascade through Messages/MultimodalInput.
  const getAdvancedTools = useAtomCallback(
    useCallback((get) => get(advancedToolsAtom), [])
  )
  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId

  const setChatInput = useSetAtom(chatInputAtom)
  const setChatStatus = useSetAtom(chatStatusAtom)
  const setChatStop = useSetAtom(chatStopFnAtom)

  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [title, setTitle] = useState(chatTitle)

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
    chatTitle: title,
    api: `${BASE_URL}/api/chat`,
    messages: initialMessages,
    generateId: uuidV4,
    prepareBody: ({ id, messages, body }) => ({
      ...body,
      id,
      messages,
      advancedTools: getAdvancedTools(),
      projectId: projectIdRef.current
    }),
    onFinish: () => {
      mutate('/api/history')
      if (!routeId) {
        navigate(`/chat/${id}`, { replace: true })
      }
    },
    onError: (e) => {
      sileo.error({
        title: 'Something went wrong',
        description:
          e instanceof Error
            ? e.message
            : 'An error occurred, please try again!'
      })
    },
    onTitle: (newTitle) => {
      setTitle(newTitle)
      mutate('/api/history')
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

  // Quick-chat: if localStorage had a pending quick-chat message at mount, send it immediately
  useEffect(() => {
    const quickChat = quickChatRef.current
    if (quickChat) {
      setChatInput(quickChat)
      // Use replaceState for immediate URL update; React Router navigate
      // happens in onFinish after the stream completes.
      window.history.replaceState({}, '', `/chat/${id}`)
      sendMessage({ text: quickChat })
      setChatInput('')
      window.localStorage.removeItem(QUICK_CHAT_KEY)
    }
  }, [id, sendMessage, setChatInput])

  return (
    <>
      {projectId && <ProjectBreadcrumb projectId={projectId} />}
      <Messages
        chatId={id}
        status={status}
        messages={messages}
        regenerate={regenerate}
      />
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
