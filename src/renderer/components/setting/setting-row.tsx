import React from 'react'
import type { FieldError as RHFFieldError } from 'react-hook-form'

import { FieldDescription, FieldLabel } from '@/components/ui/field'

// ─── SettingSection ──────────────────────────────────────────────────────────

interface SettingSectionProps {
  children: React.ReactNode
}

/**
 * Container for a group of SettingRow items, auto-inserts separators between children.
 */
export function SettingSection({ children }: SettingSectionProps) {
  return <div className="flex flex-col gap-3">{children}</div>
}

// ─── SettingRow ──────────────────────────────────────────────────────────────

interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
  error?: RHFFieldError
  /**
   * Layout mode:
   * - "horizontal" (default): label+desc left, control right (for Select, Switch, short inputs)
   * - "vertical": label → desc → control → error stacked top-to-bottom (for full-width Input, multi-select)
   */
  layout?: 'horizontal' | 'vertical'
}

/**
 * Standardized setting row with consistent spacing.
 */
export function SettingRow({
  label,
  description,
  children,
  error,
  layout = 'horizontal'
}: SettingRowProps) {
  if (layout === 'vertical') {
    return (
      <div
        className="my-2 flex flex-col gap-1.5"
        data-invalid={!!error || undefined}
      >
        <FieldLabel>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
        {children}
        {error && <p className="text-destructive text-xs">{error.message}</p>}
      </div>
    )
  }

  return (
    <div
      className="my-2 flex items-center justify-between gap-4"
      data-invalid={!!error || undefined}
    >
      <div className="flex max-w-[80%] flex-col gap-1">
        <FieldLabel>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <p className="text-destructive text-xs">{error.message}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
