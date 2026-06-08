import { REGEXP_ONLY_DIGITS } from 'input-otp'

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot
} from '@/components/ui/input-otp'
import { cn } from '@/lib/utils'

const PIN_LENGTH = 6

/**
 * Shared 6-digit PIN entry rendered as two groups of three OTP slots split by a
 * separator. Used by the lock screen and the Lock & Privacy settings so both
 * share one look. Digit-only; calls `onChange` with the current value.
 */
export function PinInput({
  value,
  onChange,
  autoFocus,
  shake,
  slotClassName
}: {
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
  shake?: boolean
  slotClassName?: string
}) {
  const slot = (index: number) => (
    <InputOTPSlot
      index={index}
      className={cn('rounded-md border', slotClassName)}
    />
  )

  return (
    <div className={cn('w-fit', shake && 'animate-shake')}>
      <InputOTP
        maxLength={PIN_LENGTH}
        value={value}
        onChange={onChange}
        pattern={REGEXP_ONLY_DIGITS}
        autoFocus={autoFocus}
        containerClassName="gap-3"
      >
        <InputOTPGroup className="gap-2">
          {slot(0)}
          {slot(1)}
          {slot(2)}
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup className="gap-2">
          {slot(3)}
          {slot(4)}
          {slot(5)}
        </InputOTPGroup>
      </InputOTP>
    </div>
  )
}
