import { Theme, useTheme } from '@/components/theme-provider'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useUpdater } from '@/hooks/use-updater'
import { updaterSetAutoDownload } from '@/lib/ipc'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { useEffect } from 'react'
import { AvatarUploader } from './avatar-uploader'
import { UpdatePanel } from './update-panel'

export function General({ form }: { form: UseFormReturnType }) {
  const { theme, setTheme } = useTheme()
  const { payload } = useUpdater()
  const autoUpdate = form.watch('autoUpdate') ?? true

  useEffect(() => {
    updaterSetAutoDownload(autoUpdate)
  }, [autoUpdate])

  return (
    <div className="flex flex-col gap-3">
      <Field orientation="horizontal">
        <FieldLabel>Theme</FieldLabel>
        <Select
          value={theme}
          onValueChange={(value) => value && setTheme(value as Theme)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent className="no-draggable">
            <SelectGroup>
              <SelectItem value="light">
                <Sun /> Light
              </SelectItem>
              <SelectItem value="dark">
                <Moon /> Dark
              </SelectItem>
              <SelectItem value="system">
                <SunMoon /> System
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Separator />

      <Field>
        <div className="my-2 flex items-center justify-between">
          <FieldLabel>Run on startup</FieldLabel>
          <Switch />
        </div>
        <FieldDescription>
          Automatically start Exodus when you log in
        </FieldDescription>
      </Field>

      <Separator />

      <Field>
        <div className="my-2 flex items-center justify-between">
          <FieldLabel>Menu bar</FieldLabel>
          <Switch />
        </div>
        <FieldDescription>Show Exodus in the menu bar</FieldDescription>
      </Field>

      <Separator />
      <Field className="flex-row items-center justify-between">
        <div className="my-2 flex flex-col gap-2">
          <FieldLabel>Assistant Avatar</FieldLabel>
          <FieldDescription>
            Personalize your assistant with an avatar for a better user
            experience.
          </FieldDescription>
        </div>

        <AvatarUploader
          props={{ control: form.control, name: 'assistantAvatar' }}
        />
      </Field>

      <Separator />

      <Field>
        <div className="my-2 flex items-center justify-between">
          <FieldLabel>Auto Update</FieldLabel>
          <Switch
            checked={autoUpdate}
            onCheckedChange={(checked) => form.setValue('autoUpdate', checked)}
          />
        </div>
        <FieldDescription>
          Automatically download and install updates when available
        </FieldDescription>
      </Field>

      <UpdatePanel payload={payload} autoUpdate={autoUpdate} />
    </div>
  )
}
