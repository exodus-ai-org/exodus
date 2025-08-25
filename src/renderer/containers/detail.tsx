import { Chat } from '@/components/chat'
import type { Message as DBMessage } from '@shared/types/db'
import { convertToUIMessages } from '@shared/utils/ai'
import { fetcher } from '@shared/utils/http'
import { useParams } from 'react-router'
import useSWR from 'swr'

export function Detail() {
  const { id } = useParams()
  const { data: messagesFromDb } = useSWR<DBMessage[]>(`/api/chat/${id}`, {
    fallbackData: [],
    fetcher
  })

  if (!id || !messagesFromDb) {
    window.location.href = '/'
    return null
  }

  return <Chat id={id} initialMessages={convertToUIMessages(messagesFromDb)} />
}
