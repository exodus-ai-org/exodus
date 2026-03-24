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
}

interface SettingsSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SettingsSelectOption[]
  placeholder?: string
  disabled?: boolean
}

/**
 * Standardized Select for Settings pages.
 * Borderless trigger with hover accent, auto-width, and proper label display.
 */
export function SettingsSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled
}: SettingsSelectProps) {
  const labelMap = new Map(options.map((o) => [o.value, o.label]))

  return (
    <Select
      value={value}
      onValueChange={(val) => val && onValueChange(val)}
      disabled={disabled}
    >
      <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
        <SelectValue placeholder={placeholder}>
          {(val: string) => labelMap.get(val) || placeholder || val}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-full">
        <SelectGroup>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
