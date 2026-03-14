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
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { AvatarUploader } from './avatar-uploader'

export function General({ form }: { form: UseFormReturnType }) {
  const { theme, setTheme } = useTheme()

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
          <FieldLabel>Software Update</FieldLabel>
          <Switch />
        </div>
      </Field>
    </div>
  )
}
