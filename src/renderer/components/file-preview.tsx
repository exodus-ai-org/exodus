import { attachmentAtom } from '@/stores/chat'
import { produce } from 'immer'
import { useAtom } from 'jotai'
import { X } from 'lucide-react'

export function FilePreview() {
  const [attachments, setAttachments] = useAtom(attachmentAtom)

  const deleteAttachment = (idx: number) => {
    setAttachments(
      produce(attachments, (draft) => {
        draft?.splice(idx, 1)
      })
    )
  }

  if (!attachments || attachments.length === 0) return null

  return (
    <section className="m-2 mt-4 flex w-full flex-row gap-4">
      {attachments.map((attachment, idx) => (
        <section className="group relative" key={idx}>
          <span className="absolute -top-2 -right-2 rounded-full border-3 border-gray-50 bg-black p-0.75 dark:border-black dark:bg-white">
            <X
              onClick={() => deleteAttachment(idx)}
              className="h-2.5 w-2.5 cursor-pointer text-white dark:text-black"
              strokeWidth={2.5}
            />
          </span>
          <img
            src={attachment.url}
            alt={attachment.name}
            className="h-14 w-14 rounded-xl object-cover"
          />
        </section>
      ))}
    </section>
  )
}
