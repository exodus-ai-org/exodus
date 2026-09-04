import { useMemo } from 'react'

import { Kbd } from '@/components/ui/kbd'
import { Switch } from '@/components/ui/switch'
import { SHORTCUT_MAP, ShortcutDef } from '@/hooks/use-keyboard-shortcuts'
import { useSettings } from '@/hooks/use-settings'

import { SettingsSection } from '../settings-row'

function ShortcutRow({
  shortcut,
  disabled,
  onToggle
}: {
  shortcut: ShortcutDef
  disabled: boolean
  onToggle: (id: string, enabled: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex w-9 shrink-0">
        {shortcut.toggleable !== false && (
          <Switch
            checked={!disabled}
            onCheckedChange={(checked) => onToggle(shortcut.id, checked)}
          />
        )}
      </div>
      <span className="flex-1 text-sm">{shortcut.label}</span>
      <Kbd>{shortcut.keys.join(' + ')}</Kbd>
    </div>
  )
}

function ShortcutGroup({
  title,
  shortcuts,
  disabledIds,
  onToggle
}: {
  title: string
  shortcuts: ShortcutDef[]
  disabledIds: Set<string>
  onToggle: (id: string, enabled: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h3>
      <div className="divide-border divide-y">
        {shortcuts.map((s) => (
          <ShortcutRow
            key={s.id}
            shortcut={s}
            disabled={disabledIds.has(s.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcuts() {
  const { data: settings, updateSettings } = useSettings()

  const disabledIds = useMemo(
    () => new Set(settings?.keyboardShortcuts?.disabled ?? []),
    [settings?.keyboardShortcuts?.disabled]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, ShortcutDef[]>()
    for (const s of SHORTCUT_MAP) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return map
  }, [])

  const handleToggle = (id: string, enabled: boolean) => {
    if (!settings) return
    const next = new Set(disabledIds)
    if (enabled) {
      next.delete(id)
    } else {
      next.add(id)
    }
    updateSettings({
      ...settings,
      keyboardShortcuts: { disabled: Array.from(next) }
    })
  }

  return (
    <SettingsSection plain>
      <div className="flex flex-col gap-6">
        {Array.from(grouped.entries()).map(([category, shortcuts]) => (
          <ShortcutGroup
            key={category}
            title={category}
            shortcuts={shortcuts}
            disabledIds={disabledIds}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </SettingsSection>
  )
}
