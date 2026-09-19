import type { ReactNode } from 'react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export interface SettingsSelectOption {
  value: string
  label: string
  /** Shown before the label, in the list and in the trigger (a flag, an icon). */
  icon?: ReactNode
  disabled?: boolean
}

interface SettingsSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SettingsSelectOption[]
  placeholder?: string
  disabled?: boolean
  /** Applied to the trigger — e.g. a fixed width for filter bars. */
  className?: string
  /** `data-testid` for the trigger. */
  testId?: string
}

/**
 * Standardized Select for Settings pages: auto-width trigger, label lookup for
 * the trigger value, and `w-full` content. Use this instead of composing raw
 * `Select*` primitives so every settings dropdown looks and behaves the same.
 */
export function SettingsSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  testId
}: SettingsSelectProps) {
  const optionMap = new Map(options.map((o) => [o.value, o]))

  return (
    <Select
      value={value}
      onValueChange={(val) => val && onValueChange(val)}
      disabled={disabled}
    >
      <SelectTrigger data-testid={testId} className={className}>
        <SelectValue placeholder={placeholder}>
          {(val: string) => {
            const selected = optionMap.get(val)
            if (!selected) return placeholder || val
            return (
              <span className="flex items-center gap-2">
                {selected.icon}
                {selected.label}
              </span>
            )
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-full">
        <SelectGroup>
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              <span className="flex items-center gap-2">
                {opt.icon}
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
