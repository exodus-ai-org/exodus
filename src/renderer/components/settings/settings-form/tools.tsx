import { toToolName } from '@exodus/shared/constants/tool-names'
import {
  GROUP_TITLE_KEYS,
  TOOL_GROUPS,
  TOOL_REGISTRY,
  ToolGroup
} from '@exodus/shared/constants/tools'
import { UseFormReturnType } from '@exodus/shared/schemas/settings-schema'
import type { ParseKeys } from 'i18next'
import { ChevronRightIcon } from 'lucide-react'
import { useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { Switch } from '@/components/ui/switch'

import { SettingsSection } from '../settings-row'
import { GoogleMaps } from './google-maps'
import { ImageGeneration } from './image-generation'
import { WebSearch } from './web-search'

/** Tools whose config panel expands inline under their row. */
const TOOL_CONFIG: Record<
  string,
  (props: { form: UseFormReturnType }) => React.ReactNode
> = {
  webSearch: WebSearch,
  imageGeneration: ImageGeneration,
  mapItinerary: GoogleMaps
}

function ToolRow({
  toolKey,
  labelKey,
  descriptionKey,
  enabled,
  onToggle,
  form
}: {
  toolKey: string
  labelKey: ParseKeys<'settings'>
  descriptionKey: ParseKeys<'settings'>
  enabled: boolean
  onToggle: (enabled: boolean) => void
  form: UseFormReturnType
}) {
  const { t } = useTranslation('settings')
  const Config = TOOL_CONFIG[toolKey]

  if (!Config) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">{t(labelKey)}</div>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t(descriptionKey)}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="mt-0.5 shrink-0"
        />
      </div>
    )
  }

  return (
    <Collapsible defaultOpen>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <CollapsibleTrigger className="group/ct -ml-1 flex items-center gap-1 rounded text-left">
            <ChevronRightIcon className="text-muted-foreground size-3.5 shrink-0 transition-transform duration-200 group-data-panel-open/ct:rotate-90" />
            <span className="text-sm font-medium">{t(labelKey)}</span>
          </CollapsibleTrigger>
          <p className="text-muted-foreground mt-0.5 pl-[18px] text-sm">
            {t(descriptionKey)}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="mt-0.5 shrink-0"
        />
      </div>
      <CollapsibleContent>
        <div className="bg-muted/50 mt-3 rounded-xl px-3.5 py-3.5">
          <Config form={form} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function Tools({ form }: { form: UseFormReturnType }) {
  const { t } = useTranslation('settings')
  // Keys saved before the snake_case rename are read as their new name and
  // written back as such on the next toggle.
  const disabledTools: string[] = (
    useWatch({ control: form.control, name: 'tools.disabledTools' }) ?? []
  ).map(toToolName)

  function toggle(key: string, enabled: boolean) {
    const current: string[] = (
      (form.getValues('tools.disabledTools') as string[] | null) ?? []
    ).map(toToolName)
    const next = enabled
      ? current.filter((k) => k !== key)
      : [...current.filter((k) => k !== key), key]
    form.setValue('tools.disabledTools', next, { shouldDirty: true })
  }

  const grouped = TOOL_GROUPS.map((group) => ({
    group,
    tools: TOOL_REGISTRY.filter((t) => t.group === group)
  })) satisfies { group: ToolGroup; tools: typeof TOOL_REGISTRY }[]

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(({ group, tools }) => (
        <SettingsSection key={group} title={t(GROUP_TITLE_KEYS[group])}>
          {tools.map((tool) => (
            <ToolRow
              key={tool.key}
              toolKey={tool.key}
              labelKey={tool.labelKey}
              descriptionKey={tool.descriptionKey}
              enabled={!disabledTools.includes(tool.key)}
              onToggle={(checked) => toggle(tool.key, checked)}
              form={form}
            />
          ))}
        </SettingsSection>
      ))}
    </div>
  )
}
