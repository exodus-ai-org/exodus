import { Chat } from '@/components/chat'
import { useParams } from 'react-router'

export function Detail() {
  const { id } = useParams()
  return <Chat id={id} initialMessages={[]} />
}
