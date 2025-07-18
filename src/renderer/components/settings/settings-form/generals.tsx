import { Theme, useTheme } from '@/components/theme-provider'
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Moon, Sun, SunMoon } from 'lucide-react'

export function General() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-col gap-3">
      <FormItem className="flex justify-between">
        <FormLabel className="mb-0">Theme</FormLabel>
        <Select value={theme} onValueChange={(value: Theme) => setTheme(value)}>
          <FormControl className="mb-0 w-fit">
            <SelectTrigger className="hover:bg-accent border-none shadow-none">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
          </FormControl>
          <FormMessage />
          <SelectContent>
            <SelectItem value="light">
              <Sun /> Light
            </SelectItem>
            <SelectItem value="dark">
              <Moon /> Dark
            </SelectItem>
            <SelectItem value="system">
              <SunMoon /> System
            </SelectItem>
          </SelectContent>
        </Select>
      </FormItem>

      <Separator />

      <FormItem className="flex flex-col">
        <div className="my-2 flex items-center justify-between">
          <FormLabel className="mb-0">Run on startup</FormLabel>
          <Switch className="mb-0" />
        </div>
        <FormDescription>
          Automatically start Exodus when you log in
        </FormDescription>
      </FormItem>

      <Separator />
      <FormItem className="flex flex-col">
        <div className="my-2 flex items-center justify-between">
          <FormLabel className="mb-0">Assistant Avatar</FormLabel>
          <Switch className="mb-0" />
        </div>
        <FormDescription>
          Personalize your assistant with an avatar for a better user
          experience. The avatar will be displayed to the left of each assistant
          message.
        </FormDescription>
      </FormItem>
    </div>
  )
}
