import { CodePreview } from '@/components/artifacts/code-preview'
import { Chat } from '@/components/chat'
import { convertToUIMessages, fetcher } from '@/lib/utils'
import { useParams } from 'react-router'
import type { Message as DBMessage } from 'src/main/lib/db/schema'
import useSWR from 'swr'

export function Detail() {
  const { id } = useParams()
  const { data: messagesFromDb } = useSWR<DBMessage[]>(
    `/api/chat/${id}`,
    fetcher,
    {
      fallbackData: []
    }
  )

  if (!id || !messagesFromDb) {
    // TODO: Redirect to 404
    return null
  }

  console.log(
    'convertToUIMessages(messagesFromDb)',
    convertToUIMessages(messagesFromDb)
  )

  return (
    <>
      <Chat id={id} initialMessages={convertToUIMessages(messagesFromDb)} />
      <CodePreview />
    </>
  )
}
