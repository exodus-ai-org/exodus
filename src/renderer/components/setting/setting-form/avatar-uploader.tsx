import { useSetting } from '@/hooks/use-setting'
import { convertFileToBase64 } from '@/lib/utils'
import { PlusIcon, XIcon } from 'lucide-react'
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
  const { data: setting, updateSetting } = useSetting()

  const handleEditorChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!setting) return

    const file = e.target.files?.[0]
    if (file) {
      const base64 = await convertFileToBase64(file)
      field.onChange(base64)
      updateSetting({ ...setting, assistantAvatar: base64 })
    }

    if (ref.current) {
      ref.current.value = ''
    }
  }

  const handleRemove = () => {
    if (!setting) return

    field.onChange('')
    updateSetting({ ...setting, assistantAvatar: '' })
  }

  return (
    <div className="relative flex size-16! shrink-0 items-center justify-center rounded-full border">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        id="assistant-avatar"
        className="absolute top-0 left-0 z-10 size-16 opacity-0"
        onChange={handleEditorChange}
      />
      {field.value ? (
        <img
          src={field.value}
          alt="assistant-avatar"
          className="size-16 rounded-full object-cover"
        />
      ) : (
        <PlusIcon />
      )}

      {!!field.value && (
        <span className="border-background bg-foreground absolute -top-1 -right-1 z-100 rounded-full border-3 p-0.75">
          <XIcon
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleRemove()
            }}
            className="text-background size-2.5"
            strokeWidth={2.5}
          />
        </span>
      )}
    </div>
  )
}
