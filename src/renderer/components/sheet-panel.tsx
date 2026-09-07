import { XIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Inline (non-portal) side panel that lives in the layout flow. Animates a
 * width transition (w-0 → w-88) instead of overlaying like <Sheet>. Kept
 * outside `components/ui` so shadcn regeneration doesn't drop it.
 */
export function SheetPanel({
  open,
  onClose,
  className,
  children,
  ...props
}: React.ComponentProps<'section'> & {
  open: boolean
  onClose: () => void
}) {
  return (
    <section
      data-slot="sheet-panel"
      className={cn(
        'bg-background invisible relative flex h-svh w-0 shrink-0 flex-col overflow-hidden transition-[width] duration-200',
        open && 'visible w-88 overflow-y-auto border-l',
        className
      )}
      {...props}
    >
      {children}
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-3 z-20 rounded-full"
        onClick={onClose}
      >
        <XIcon />
        <span className="sr-only">Close</span>
      </Button>
    </section>
  )
}
