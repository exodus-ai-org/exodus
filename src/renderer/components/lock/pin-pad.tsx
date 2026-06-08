import { cn } from '@/lib/utils'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']
const PIN_LENGTH = 6

export function PinPad({
  value,
  onChange,
  shake
}: {
  value: string
  onChange: (next: string) => void
  shake?: boolean
}) {
  const press = (k: string) => {
    if (k === 'del') return onChange(value.slice(0, -1))
    if (k === '' || value.length >= PIN_LENGTH) return
    onChange((value + k).slice(0, PIN_LENGTH))
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className={cn('flex gap-4', shake && 'animate-shake')}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'size-3.5 rounded-full border transition-colors',
              i < value.length
                ? 'bg-foreground border-foreground'
                : 'border-muted-foreground/40'
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              className="bg-muted/60 hover:bg-muted size-16 rounded-full text-2xl font-light transition-colors active:scale-95"
            >
              {k === 'del' ? '⌫' : k}
            </button>
          )
        )}
      </div>
    </div>
  )
}
