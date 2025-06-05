import { Chat } from '@/components/chat'
import { convertToUIMessages } from '@/lib/utils'
import type { Message as DBMessage } from '@shared/types/db'
import { useParams } from 'react-router'
import useSWR from 'swr'

export function Detail() {
  const { id } = useParams()
  const { data: messagesFromDb } = useSWR<DBMessage[]>(`/api/chat/${id}`, {
    fallbackData: []
  })

  if (!id || !messagesFromDb) {
    window.location.hash = '#/'
    return null
  }

  return <Chat id={id} initialMessages={convertToUIMessages(messagesFromDb)} />
}
