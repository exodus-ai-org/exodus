import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export interface SettingSelectOption {
  value: string
  label: string
}

interface SettingSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SettingSelectOption[]
  placeholder?: string
  disabled?: boolean
}

/**
 * Standardized Select for Settings pages.
 * Borderless trigger with hover accent, auto-width, and proper label display.
 */
export function SettingSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled
}: SettingSelectProps) {
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
      <SelectContent>
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
