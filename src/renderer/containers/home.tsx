import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { v4 as uuidV4 } from 'uuid'

import { Chat } from '@/components/chat'

export function Home() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') ?? undefined

  // One chat per visit. Every navigation to `/` is a new location key — New
  // Chat, a quick-chat hand-off, from `/` itself too — and gets a new id and,
  // through `key`, a fresh <Chat>: what `Chat` reads on mount (the quick-chat
  // text) is read again. Between navigations the id holds, so a render of
  // Home never moves a chat that is streaming to another id.
  const { key } = useLocation()
  const [visit, setVisit] = useState(() => ({ key, id: uuidV4() }))
  if (visit.key !== key) setVisit({ key, id: uuidV4() })

  return (
    <Chat
      key={visit.id}
      id={visit.id}
      initialMessages={[]}
      projectId={projectId}
      chatTitle="New chat"
      showDiscover={projectId == null}
    />
  )
}
