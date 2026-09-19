import { contrastingForeground, normalizeHex } from '@exodus/shared/utils/color'
import { useEffect, useState } from 'react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

/**
 * A colour chip filled with the colour itself: a native colour picker drawn
 * as a round swatch on the left and the hex on the right. Typing commits only
 * once the text parses as a hex colour; blur restores the committed value.
 */
export function ColorField({
  value,
  onChange,
  disabled,
  testId,
  ariaLabel
}: {
  value: string
  onChange: (hex: string) => void
  disabled?: boolean
  testId?: string
  ariaLabel: string
}) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const fg = contrastingForeground(value, ['#ffffff', '#000000'])

  return (
    <InputGroup
      className={cn('w-36 border-transparent', disabled && 'opacity-70')}
      style={{ backgroundColor: value, color: fg }}
    >
      <InputGroupAddon align="inline-start">
        <input
          type="color"
          className="color-swatch-input"
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value)}
        />
      </InputGroupAddon>
      <InputGroupInput
        data-testid={testId}
        value={text}
        disabled={disabled}
        spellCheck={false}
        className="font-mono text-xs uppercase"
        style={{ color: fg }}
        onChange={(e) => {
          setText(e.target.value)
          const hex = normalizeHex(e.target.value)
          if (hex && hex !== value) onChange(hex)
        }}
        onBlur={() => setText(value)}
      />
    </InputGroup>
  )
}
