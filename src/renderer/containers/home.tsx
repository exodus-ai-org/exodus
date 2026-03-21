import { v4 as uuidV4 } from 'uuid'

import { Chat } from '@/components/chat'

export function Home() {
  return <Chat id={uuidV4()} initialMessages={[]} />
}
