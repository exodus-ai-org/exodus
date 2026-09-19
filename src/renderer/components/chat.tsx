import { QUICK_CHAT_KEY } from '@exodus/shared/constants/misc'
import { BASE_URL } from '@exodus/shared/constants/systems'
import { ChatMessage } from '@exodus/shared/types/chat'
import { useSetAtom } from 'jotai'
import { useAtomCallback } from 'jotai/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { sileo } from 'sileo'
import useSWR, { mutate } from 'swr'
import { v4 as uuidV4 } from 'uuid'

import { useChat } from '@/hooks/use-chat'
import { advancedToolsAtom, reasoningEffortAtom } from '@/stores/chat'
import { chatInputAtom, chatStatusAtom, chatStopFnAtom } from '@/stores/input'
import type { Project } from '@/types/db'

import { LcmStatusCard } from './chat/lcm-status-card'
import Messages from './messages'
import MultimodalInput from './multimodel-input'

function ProjectBreadcrumb({ projectId }: { projectId: string }) {
  const { data: project } = useSWR<Project & { chatCount: number }>(
    `/api/v1/project/${projectId}`
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
  showDiscover?: boolean
}

export function Chat({
  id,
  initialMessages,
  projectId,
  chatTitle,
  showDiscover
}: Props) {
  const { t } = useTranslation('chat')
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
  const getReasoningEffort = useAtomCallback(
    useCallback((get) => get(reasoningEffortAtom), [])
  )
  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId

  const setChatInput = useSetAtom(chatInputAtom)
  const setChatStatus = useSetAtom(chatStatusAtom)
  const setChatStop = useSetAtom(chatStopFnAtom)

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
    api: `${BASE_URL}/api/v1/chat`,
    messages: initialMessages,
    generateId: uuidV4,
    prepareBody: ({ id, messages, body }) => ({
      ...body,
      id,
      messages,
      advancedTools: getAdvancedTools(),
      reasoningEffort: getReasoningEffort(),
      projectId: projectIdRef.current
    }),
    onFinish: () => {
      mutate('/api/v1/history')
      if (!routeId) {
        navigate(`/chat/${id}`, { replace: true })
      }
    },
    onError: (e) => {
      sileo.error({
        title: t('toast.sendFailedTitle'),
        description:
          e instanceof Error ? e.message : t('toast.sendFailedDescription')
      })
    },
    onTitle: (newTitle) => {
      setTitle(newTitle)
      mutate('/api/v1/history')
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

  const composer = (
    <>
      <LcmStatusCard chatId={id} />
      <MultimodalInput
        chatId={id}
        messages={messages}
        setMessages={setMessages}
        sendMessage={sendMessage}
        lastUsage={lastUsage}
      />
    </>
  )

  return (
    <>
      {projectId && <ProjectBreadcrumb projectId={projectId} />}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Messages
          chatId={id}
          status={status}
          messages={messages}
          regenerate={regenerate}
          showDiscover={showDiscover}
        />

        {messages.length === 0 ? (
          // Landing screen: the composer stays in normal flow so the greeting
          // and the Discover feed above it stay fully visible and clickable —
          // an overlay here would cover the bottom feed row.
          <div className="shrink-0 pb-6">{composer}</div>
        ) : (
          // Conversation: the composer floats over the message list, which
          // scrolls its full height behind it and dissolves into a scrim just
          // above the input (ChatGPT-style). `pointer-events-none` on the dock
          // lets a wheel over the scrim still scroll the list; its children
          // opt back in so the pill and status card stay interactive.
          <div className="from-card pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-linear-to-t to-transparent pb-6 [&>*]:pointer-events-auto">
            {composer}
          </div>
        )}
      </div>
    </>
  )
}
