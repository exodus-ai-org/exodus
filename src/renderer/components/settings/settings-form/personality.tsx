import type { UseFormReturnType } from '@shared/schemas/settings-schema'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { SettingsRow, SettingsSection } from '../settings-row'
import { SettingsSelect } from '../settings-select'

type BaseStyle =
  | 'default'
  | 'professional'
  | 'friendly'
  | 'candid'
  | 'quirky'
  | 'efficient'
  | 'cynical'
type Level = 'default' | 'more' | 'less'

const BASE_STYLES = [
  { value: 'default', label: 'Default' },
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'candid', label: 'Candid' },
  { value: 'quirky', label: 'Quirky' },
  { value: 'efficient', label: 'Efficient' },
  { value: 'cynical', label: 'Cynical' }
]

const LEVELS = [
  { value: 'default', label: 'Default' },
  { value: 'more', label: 'More' },
  { value: 'less', label: 'Less' }
]

export function Personality({ form }: { form: UseFormReturnType }) {
  const baseStyle = form.watch('personality.baseStyle') ?? 'default'
  const warm = form.watch('personality.warm') ?? 'default'
  const enthusiastic = form.watch('personality.enthusiastic') ?? 'default'
  const headersAndLists = form.watch('personality.headersAndLists') ?? 'default'
  const emoji = form.watch('personality.emoji') ?? 'default'

  return (
    <SettingsSection>
      {/* Personalization */}
      <SettingsRow
        label="Base style and tone"
        description="Set the style and tone of how Exodus responds to you"
      >
        <SettingsSelect
          value={baseStyle}
          onValueChange={(v) =>
            form.setValue('personality.baseStyle', v as BaseStyle)
          }
          options={BASE_STYLES}
        />
      </SettingsRow>

      <SettingsRow label="Warm">
        <SettingsSelect
          value={warm}
          onValueChange={(v) => form.setValue('personality.warm', v as Level)}
          options={LEVELS}
        />
      </SettingsRow>

      <SettingsRow label="Enthusiastic">
        <SettingsSelect
          value={enthusiastic}
          onValueChange={(v) =>
            form.setValue('personality.enthusiastic', v as Level)
          }
          options={LEVELS}
        />
      </SettingsRow>

      <SettingsRow label="Headers & Lists">
        <SettingsSelect
          value={headersAndLists}
          onValueChange={(v) =>
            form.setValue('personality.headersAndLists', v as Level)
          }
          options={LEVELS}
        />
      </SettingsRow>

      <SettingsRow label="Emoji">
        <SettingsSelect
          value={emoji}
          onValueChange={(v) => form.setValue('personality.emoji', v as Level)}
          options={LEVELS}
        />
      </SettingsRow>

      <SettingsRow
        label="Custom instructions"
        description="Additional behavior, style, and tone preferences"
        layout="vertical"
      >
        <Textarea
          placeholder="Additional behavior, style, and tone preferences"
          className="min-h-[80px]"
          value={form.watch('personality.customInstructions') ?? ''}
          onChange={(e) =>
            form.setValue('personality.customInstructions', e.target.value)
          }
        />
      </SettingsRow>

      {/* About you */}
      <SettingsRow label="Nickname" layout="vertical">
        <Input
          placeholder="What should Exodus call you?"
          value={form.watch('personality.nickname') ?? ''}
          onChange={(e) =>
            form.setValue('personality.nickname', e.target.value)
          }
        />
      </SettingsRow>

      <SettingsRow label="Occupation" layout="vertical">
        <Input
          placeholder="e.g., Software engineer, Designer"
          value={form.watch('personality.occupation') ?? ''}
          onChange={(e) =>
            form.setValue('personality.occupation', e.target.value)
          }
        />
      </SettingsRow>

      <SettingsRow label="More about you" layout="vertical">
        <Textarea
          placeholder="Interests, values, or preferences to keep in mind"
          className="min-h-[80px]"
          value={form.watch('personality.aboutYou') ?? ''}
          onChange={(e) =>
            form.setValue('personality.aboutYou', e.target.value)
          }
        />
      </SettingsRow>
    </SettingsSection>
  )
}
