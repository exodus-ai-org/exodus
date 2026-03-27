import { useSearchParams } from 'react-router'
import { v4 as uuidV4 } from 'uuid'

import { Chat } from '@/components/chat'

export function Home() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') ?? undefined

  return <Chat id={uuidV4()} initialMessages={[]} projectId={projectId} />
}
