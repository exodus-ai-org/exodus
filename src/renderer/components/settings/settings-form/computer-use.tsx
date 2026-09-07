import { TEST_IDS } from '@shared/constants/test-ids'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import type { InstalledApp } from '@shared/types/computer-use'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useInstalledApps } from '@/hooks/use-installed-apps'

import { SettingsRow, SettingsSection } from '../settings-row'

function AppIcon({
  app,
  className
}: {
  app: InstalledApp
  className?: string
}) {
  if (!app.icon) return null
  return <img src={app.icon} alt="" className={className} />
}

export function ComputerUse({ form }: { form: UseFormReturnType }) {
  const allowlist: string[] = form.watch('computerUse.targetAllowlist') ?? []
  const { apps, isLoading } = useInstalledApps(true)

  // The dropdown options are the installed apps, plus a stand-in for any
  // allowlisted name that isn't installed (renamed / removed since it was added).
  const byName = new Map(apps.map((a) => [a.name, a]))
  const options: InstalledApp[] = [
    ...apps,
    ...allowlist
      .filter((name) => !byName.has(name))
      .map((name) => ({ name, bundleId: '', path: '' }))
  ]
  const selected = allowlist.flatMap((name) => {
    const found = options.find((a) => a.name === name)
    return found ? [found] : []
  })
  const chipsAnchor = useComboboxAnchor()

  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          Computer Use lets the AI operate one window on your Mac with a virtual
          mouse and keyboard — it sees a screenshot each step and acts like a
          person. It needs a vision-capable AI model. It only touches apps you
          add to the allowlist below (and will open one that isn&apos;t already
          running), you can stop it any time with ⌥⇧⎋, and every session is
          logged. Off by default.
        </AlertDescription>
      </Alert>

      <SettingsSection>
        <SettingsRow
          label="Enable Computer Use"
          description="Let the AI drive an allowlisted window."
        >
          <Controller
            control={form.control}
            name="computerUse.enabled"
            render={({ field }) => (
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                data-testid={TEST_IDS.computerUse.enableToggle}
              />
            )}
          />
        </SettingsRow>

        <SettingsRow
          label="Allowlisted apps"
          description="Computer Use only touches these apps. Pick from the ones installed on this Mac."
          layout="vertical"
        >
          <Combobox
            multiple
            value={selected}
            onValueChange={(items: InstalledApp[]) =>
              form.setValue(
                'computerUse.targetAllowlist',
                items.map((i) => i.name),
                { shouldDirty: true }
              )
            }
            items={options}
            itemToStringValue={(item: InstalledApp) => item.name}
          >
            <ComboboxChips ref={chipsAnchor}>
              {selected.map((app) => (
                <ComboboxChip key={app.bundleId || app.name} className="gap-1">
                  <AppIcon app={app} className="size-3.5 rounded-[3px]" />
                  {app.name}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                placeholder={
                  selected.length === 0 ? 'Search installed apps…' : ''
                }
                data-testid={TEST_IDS.computerUse.allowlistInput}
              />
            </ComboboxChips>
            <ComboboxContent anchor={chipsAnchor}>
              <ComboboxEmpty>
                {isLoading ? 'Loading apps…' : 'No app found.'}
              </ComboboxEmpty>
              <ComboboxList>
                {(app: InstalledApp) => (
                  <ComboboxItem key={app.bundleId || app.name} value={app}>
                    <AppIcon app={app} className="size-4 rounded-[4px]" />
                    <span className="truncate">{app.name}</span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </SettingsRow>

        <Controller
          control={form.control}
          name="computerUse.maxSteps"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Max steps"
              description="Stop a session after this many actions. Default 25."
              error={fieldState.error}
            >
              <Input
                type="number"
                min={1}
                max={100}
                className="w-20"
                placeholder="25"
                {...field}
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
              />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="computerUse.settleMs"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Settle delay (ms)"
              description="Wait this long after each action before the next screenshot. Default 800."
              error={fieldState.error}
            >
              <Input
                type="number"
                min={100}
                max={5000}
                className="w-24"
                placeholder="800"
                {...field}
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
              />
            </SettingsRow>
          )}
        />
      </SettingsSection>
    </>
  )
}
