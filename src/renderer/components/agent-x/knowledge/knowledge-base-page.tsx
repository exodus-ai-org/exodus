// src/renderer/components/agent-x/knowledge/knowledge-base-page.tsx
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createKnowledgeDoc,
  deleteKnowledgeDoc,
  getKnowledgeDocs
} from '@/services/agent-x-chat'
import type { KnowledgeDocData } from '@/stores/agent-x'

export function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KnowledgeDocData[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const load = () => getKnowledgeDocs().then(setDocs)
  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    if (!title.trim() || !content.trim()) return
    const doc = await createKnowledgeDoc({ title, content })
    setDocs((p) => [doc, ...p])
    setTitle('')
    setContent('')
  }

  return (
    <div className="grid grid-cols-[1fr_320px] gap-4 p-4">
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{d.title}</h3>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={async () => {
                  await deleteKnowledgeDoc(d.id)
                  setDocs((p) => p.filter((x) => x.id !== d.id))
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-3 text-xs">
              {d.content}
            </p>
          </div>
        ))}
        {docs.length === 0 && (
          <div className="text-muted-foreground text-sm">还没有文档</div>
        )}
      </div>
      <div className="space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="正文"
          className="min-h-40"
        />
        <Button onClick={add} className="w-full">
          <Plus className="mr-1 h-4 w-4" />
          添加文档
        </Button>
      </div>
    </div>
  )
}
