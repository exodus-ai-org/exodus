import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { convertFileToBase64 } from '@/lib/utils'
import { AlertCircle, Edit, Trash } from 'lucide-react'
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

  const handleEditorChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const base64 = await convertFileToBase64(file)
      field.onChange(base64)
    }

    if (ref.current) {
      ref.current.value = ''
    }
  }

  return (
    <>
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="inline">
          Personalize your assistant with an avatar for a better user
          experience. The avatar will be displayed to the left of each assistant
          message.
        </AlertDescription>
      </Alert>
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full border">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          id="assistant-avatar"
          className="absolute top-0 left-0 z-10 h-40 w-40 cursor-pointer opacity-0"
          onChange={handleEditorChange}
        />
        {field.value ? (
          <img
            src={field.value}
            alt="assistant-avatar"
            className="h-40 w-40 rounded-full object-cover"
          />
        ) : (
          <p>Click to upload</p>
        )}

        {!!field.value && (
          <Button
            size="icon"
            className="absolute -right-0 bottom-2 cursor-pointer rounded-full"
          >
            <Edit />
          </Button>
        )}

        {!!field.value && (
          <Button
            variant="destructive"
            className="absolute top-48 w-fit cursor-pointer"
            onClick={() => field.onChange('')}
          >
            <Trash />
            Remove
          </Button>
        )}
      </div>
    </>
  )
}
