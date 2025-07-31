import { useImmersion } from '@/hooks/use-immersion'
import { cn } from '@/lib/utils'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { all, createLowlight } from 'lowlight'
import { Markdown } from 'tiptap-markdown'

const lowlight = createLowlight(all)
const extensions = [
  TextStyleKit,
  StarterKit,
  Markdown,
  CodeBlockLowlight.configure({
    lowlight
  })
]

export function RichTextEditor({ className }: { className?: string }) {
  const { immersionContent } = useImmersion()
  const editor = useEditor({
    extensions,
    content: immersionContent
  })

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        isBold: ctx.editor.isActive('bold'),
        canBold: ctx.editor.can().chain().focus().toggleBold().run(),
        isItalic: ctx.editor.isActive('italic'),
        canItalic: ctx.editor.can().chain().focus().toggleItalic().run(),
        isStrike: ctx.editor.isActive('strike'),
        canStrike: ctx.editor.can().chain().focus().toggleStrike().run(),
        isCode: ctx.editor.isActive('code'),
        canCode: ctx.editor.can().chain().focus().toggleCode().run(),
        canClearMarks: ctx.editor.can().chain().focus().unsetAllMarks().run(),
        isParagraph: ctx.editor.isActive('paragraph'),
        isHeading1: ctx.editor.isActive('heading', { level: 1 }),
        isHeading2: ctx.editor.isActive('heading', { level: 2 }),
        isHeading3: ctx.editor.isActive('heading', { level: 3 }),
        isHeading4: ctx.editor.isActive('heading', { level: 4 }),
        isHeading5: ctx.editor.isActive('heading', { level: 5 }),
        isHeading6: ctx.editor.isActive('heading', { level: 6 }),
        isBulletList: ctx.editor.isActive('bulletList'),
        isOrderedList: ctx.editor.isActive('orderedList'),
        isCodeBlock: ctx.editor.isActive('codeBlock'),
        isBlockquote: ctx.editor.isActive('blockquote'),
        canUndo: ctx.editor.can().chain().focus().undo().run(),
        canRedo: ctx.editor.can().chain().focus().redo().run()
      }
    }
  })

  console.log(editorState)
  return (
    <EditorContent
      editor={editor}
      className={cn('markdown max-w-[36.35rem] p-4', className)}
    />
  )
}
