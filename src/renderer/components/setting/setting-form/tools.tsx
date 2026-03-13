import { FormDescription, FormItem, FormLabel } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { TOOL_GROUPS, TOOL_REGISTRY, ToolGroup } from '@shared/constants/tools'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { useWatch } from 'react-hook-form'

export function Tools({ form }: { form: UseFormReturnType }) {
  const disabledTools: string[] =
    useWatch({ control: form.control, name: 'tools.disabledTools' }) ?? []

  function toggle(key: string, enabled: boolean) {
    const current: string[] =
      (form.getValues('tools.disabledTools') as string[] | null) ?? []
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
    <div className="flex flex-col gap-1">
      {grouped.map(({ group, tools }, gi) => (
        <div key={group}>
          {gi > 0 && <Separator className="my-3" />}
          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
            {group}
          </p>
          <div className="flex flex-col gap-3">
            {tools.map((tool) => {
              const enabled = !disabledTools.includes(tool.key)
              return (
                <FormItem key={tool.key} className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel className="mb-0">{tool.label}</FormLabel>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => toggle(tool.key, checked)}
                    />
                  </div>
                  <FormDescription>{tool.description}</FormDescription>
                </FormItem>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
