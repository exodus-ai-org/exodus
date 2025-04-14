import { Chat } from '@/components/chat'
import { v4 as uuidV4 } from 'uuid'

export function Home() {
  return <Chat id={uuidV4()} initialMessages={[]} />
}
