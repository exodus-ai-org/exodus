// src/renderer/components/philharmonic/chat/attachment-preview.tsx
import { useAtom } from 'jotai'
import { XIcon } from 'lucide-react'

import { philharmonicAttachmentAtom } from '@/stores/philharmonic'

export function AttachmentPreview() {
  const [attachments, setAttachments] = useAtom(philharmonicAttachmentAtom)

  if (attachments.length === 0) return null

  return (
    <div className="mb-2 flex flex-wrap gap-2 px-1">
      {attachments.map((a, i) => (
        <div key={`${a.name}-${i}`} className="group relative">
          <img
            src={a.url}
            alt={a.name}
            className="bg-background h-12 w-12 rounded-lg object-cover"
          />
          <button
            type="button"
            aria-label={`Remove ${a.name}`}
            onClick={() =>
              setAttachments((p) => p.filter((_, idx) => idx !== i))
            }
            className="bg-foreground text-background ring-card absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full ring-2"
          >
            <XIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
          </button>
        </div>
      ))}
    </div>
  )
}
