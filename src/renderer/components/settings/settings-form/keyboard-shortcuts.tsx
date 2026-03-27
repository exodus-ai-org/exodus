import { useMemo } from 'react'

import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { SHORTCUT_MAP, ShortcutDef } from '@/hooks/use-keyboard-shortcuts'

import { SettingsSection } from '../settings-row'

function ShortcutRow({ shortcut }: { shortcut: ShortcutDef }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{shortcut.label}</span>
      <KbdGroup>
        {shortcut.keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </KbdGroup>
    </div>
  )
}

function ShortcutGroup({
  title,
  shortcuts
}: {
  title: string
  shortcuts: ShortcutDef[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h3>
      <div className="divide-border divide-y">
        {shortcuts.map((s) => (
          <ShortcutRow key={s.label} shortcut={s} />
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcuts() {
  const grouped = useMemo(() => {
    const map = new Map<string, ShortcutDef[]>()
    for (const s of SHORTCUT_MAP) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return map
  }, [])

  return (
    <SettingsSection>
      <div className="flex flex-col gap-6">
        {Array.from(grouped.entries()).map(([category, shortcuts]) => (
          <ShortcutGroup
            key={category}
            title={category}
            shortcuts={shortcuts}
          />
        ))}
      </div>
    </SettingsSection>
  )
}
