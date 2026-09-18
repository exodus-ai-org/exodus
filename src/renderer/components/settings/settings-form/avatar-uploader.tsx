import { PlusIcon, XIcon } from 'lucide-react'
import { ChangeEvent, useRef } from 'react'
import { FieldValues, useController, UseControllerProps } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useSettings } from '@/hooks/use-settings'
import { cn, convertFileToBase64 } from '@/lib/utils'

export function AvatarUploader<T extends FieldValues>({
  props,
  className,
  fallback
}: {
  props: UseControllerProps<T>
  className?: string
  /** Shown when no image is set — e.g. the user's initial. */
  fallback?: string
}) {
  const { t } = useTranslation('settings')
  const ref = useRef<HTMLInputElement | null>(null)
  const { field } = useController(props)
  const { data: settings, updateSettings } = useSettings()

  const handleEditorChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!settings) return

    const file = e.target.files?.[0]
    if (file) {
      const base64 = await convertFileToBase64(file)
      field.onChange(base64)
      updateSettings({ ...settings, userAvatar: base64 })
    }

    if (ref.current) {
      ref.current.value = ''
    }
  }

  const handleRemove = () => {
    if (!settings) return

    field.onChange('')
    updateSettings({ ...settings, userAvatar: '' })
  }

  return (
    <div
      className={cn(
        'relative flex size-16 shrink-0 items-center justify-center rounded-full border',
        className
      )}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*"
        id="user-avatar"
        aria-label={t('profile.avatar.uploadLabel')}
        className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
        onChange={handleEditorChange}
      />
      {field.value ? (
        <img
          src={field.value}
          alt={t('profile.avatar.alt')}
          className="size-full rounded-full object-cover"
        />
      ) : fallback ? (
        <span className="text-muted-foreground text-lg font-medium">
          {fallback}
        </span>
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
