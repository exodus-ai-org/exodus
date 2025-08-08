import { useImmersion } from '@/hooks/use-immersion'
import { cn } from '@/lib/utils'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { EditorContent, Extensions, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { all, createLowlight } from 'lowlight'
import {
  Bold,
  CaseSensitive,
  Italic,
  MessageCirclePlus,
  Send
} from 'lucide-react'
import { useState } from 'react'
import { Markdown } from 'tiptap-markdown'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Separator } from './ui/separator'

const lowlight = createLowlight(all)
const extensions: Extensions = [
  TextStyleKit,
  StarterKit,
  CodeBlockLowlight.configure({
    lowlight
  }),
  // @ts-expect-error should contact tiptap-markdown's author to update its configuration.
  Markdown
]

export function RichTextEditor({ className }: { className?: string }) {
  const { immersionContent } = useImmersion()
  const [showInput, setShowInput] = useState(false)
  const [inputText, setInputText] = useState('')

  const editor = useEditor({
    extensions,
    content: immersionContent
  })

  const resetBubble = () => {
    setShowInput(false)
    setInputText('')
  }

  return (
    <>
      {editor && (
        <BubbleMenu
          editor={editor}
          options={{
            placement: 'bottom',
            offset: 8,
            onHide: resetBubble,
            onDestroy: resetBubble
          }}
        >
          <div className="bubble-menu bg-background flex h-10 gap-2 rounded-[2.5rem] border px-2 py-1 shadow-xl">
            {showInput ? (
              <div className="flex w-full min-w-64 items-center justify-between">
                <Input
                  className="border-none shadow-none focus-visible:ring-0"
                  autoFocus
                  placeholder="Edit or explain..."
                  onChange={(e) => setInputText(e.target.value)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={!inputText.trim()}
                >
                  <Send />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  className="h-7.5 text-sm"
                  onClick={() => {
                    setShowInput(true)
                  }}
                >
                  <MessageCirclePlus />
                  <span>Ask Exodus</span>
                </Button>
                <Separator orientation="vertical" className="mx-2 !h-6" />
                <div className="flex gap-2 text-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn(
                      'h-7.5',
                      editor.isActive('bold') ? 'font-bold text-blue-500' : ''
                    )}
                  >
                    <Bold strokeWidth={3} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn(
                      'h-7.5',
                      editor.isActive('italic') ? 'text-blue-500 italic' : ''
                    )}
                  >
                    <Italic />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn('h-7.5')}
                  >
                    <CaseSensitive className="scale-150" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </BubbleMenu>
      )}

      <EditorContent
        editor={editor}
        className={cn('markdown max-w-[36.35rem] p-4', className)}
      />
    </>
  )
}
