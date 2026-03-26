import type { UseFormReturnType } from '@shared/schemas/settings-schema'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { SettingsRow, SettingsSection } from '../settings-row'

type BaseStyle =
  | 'default'
  | 'professional'
  | 'friendly'
  | 'candid'
  | 'quirky'
  | 'efficient'
  | 'cynical'
type Level = 'default' | 'more' | 'less'

const BASE_STYLES: { value: BaseStyle; label: string; description: string }[] =
  [
    {
      value: 'default',
      label: 'Default',
      description: 'Preset style and tone'
    },
    {
      value: 'professional',
      label: 'Professional',
      description: 'Polished and precise'
    },
    { value: 'friendly', label: 'Friendly', description: 'Warm and chatty' },
    { value: 'candid', label: 'Candid', description: 'Direct and encouraging' },
    {
      value: 'quirky',
      label: 'Quirky',
      description: 'Playful and imaginative'
    },
    {
      value: 'efficient',
      label: 'Efficient',
      description: 'Concise and plain'
    },
    {
      value: 'cynical',
      label: 'Cynical',
      description: 'Critical and sarcastic'
    }
  ]

const LEVELS: { value: Level; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'more', label: 'More' },
  { value: 'less', label: 'Less' }
]

function CharacteristicSelect({
  value,
  onValueChange
}: {
  value: string
  onValueChange: (v: string | null) => void
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {LEVELS.map((level) => (
            <SelectItem key={level.value} value={level.value}>
              {level.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

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
        <Select
          value={baseStyle}
          onValueChange={(v) => {
            if (v) form.setValue('personality.baseStyle', v as BaseStyle)
          }}
        >
          <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {BASE_STYLES.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  <div>
                    <div>{style.label}</div>
                    <div className="text-muted-foreground text-xs">
                      {style.description}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow label="Warm">
        <CharacteristicSelect
          value={warm}
          onValueChange={(v) => {
            if (v) form.setValue('personality.warm', v as Level)
          }}
        />
      </SettingsRow>

      <SettingsRow label="Enthusiastic">
        <CharacteristicSelect
          value={enthusiastic}
          onValueChange={(v) => {
            if (v) form.setValue('personality.enthusiastic', v as Level)
          }}
        />
      </SettingsRow>

      <SettingsRow label="Headers & Lists">
        <CharacteristicSelect
          value={headersAndLists}
          onValueChange={(v) => {
            if (v) form.setValue('personality.headersAndLists', v as Level)
          }}
        />
      </SettingsRow>

      <SettingsRow label="Emoji">
        <CharacteristicSelect
          value={emoji}
          onValueChange={(v) => {
            if (v) form.setValue('personality.emoji', v as Level)
          }}
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
