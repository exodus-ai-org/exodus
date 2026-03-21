import { produce } from 'immer'
import { useAtom } from 'jotai'
import { XIcon } from 'lucide-react'

import { attachmentAtom } from '@/stores/chat'

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
    <section className="m-2 mt-4 flex w-full flex-row gap-4 select-none">
      {attachments.map((attachment, idx) => (
        <section className="group relative" key={idx}>
          <span className="border-background bg-foreground absolute -top-2 -right-2 rounded-full border-3 p-0.75">
            <XIcon
              data-icon="close"
              onClick={() => deleteAttachment(idx)}
              className="text-background size-2.5"
              strokeWidth={2.5}
            />
          </span>
          <img
            src={attachment.url}
            alt={attachment.name}
            className="size-14 rounded-xl object-cover"
          />
        </section>
      ))}
    </section>
  )
}
