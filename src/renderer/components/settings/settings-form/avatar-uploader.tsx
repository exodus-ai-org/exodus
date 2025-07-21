import { Button } from '@/components/ui/button'
import { useSettings } from '@/hooks/use-settings'
import { convertFileToBase64 } from '@/lib/utils'
import { Plus, Trash } from 'lucide-react'
import { ChangeEvent, useRef } from 'react'
import { FieldValues, useController, UseControllerProps } from 'react-hook-form'

export function AvatarUploader<T extends FieldValues>({
  props
}: {
  props: UseControllerProps<T>
  className?: string
}) {
  const ref = useRef<HTMLInputElement | null>(null)
  const { field } = useController(props)
  const { data: settings, updateSetting } = useSettings()

  const handleEditorChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!settings) return

    const file = e.target.files?.[0]
    if (file) {
      const base64 = await convertFileToBase64(file)
      field.onChange(base64)
      updateSetting({ ...settings, assistantAvatar: base64 })
    }

    if (ref.current) {
      ref.current.value = ''
    }
  }

  const handleRemove = () => {
    if (!settings) return

    field.onChange('')
    updateSetting({ ...settings, assistantAvatar: '' })
  }

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        id="assistant-avatar"
        className="absolute top-0 left-0 z-10 h-16 w-16 opacity-0"
        onChange={handleEditorChange}
      />
      {field.value ? (
        <img
          src={field.value}
          alt="assistant-avatar"
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <Plus />
      )}

      {!!field.value && (
        <Button
          variant="destructive"
          size="icon"
          className="dark:bg-destructive absolute -right-2 -bottom-2 z-100 rounded-full"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            handleRemove()
          }}
        >
          <Trash />
        </Button>
      )}
    </div>
  )
}
