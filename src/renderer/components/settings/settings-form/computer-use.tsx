import { TEST_IDS } from '@shared/constants/test-ids'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AlertCircleIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import { SettingsRow, SettingsSection } from '../settings-row'

export function ComputerUse({ form }: { form: UseFormReturnType }) {
  const [draft, setDraft] = useState('')
  const allowlist = form.watch('computerUse.targetAllowlist') ?? []

  const addTarget = () => {
    const trimmed = draft.trim()
    if (trimmed && !allowlist.includes(trimmed)) {
      form.setValue('computerUse.targetAllowlist', [...allowlist, trimmed], {
        shouldDirty: true
      })
    }
    setDraft('')
  }

  const removeTarget = (name: string) => {
    form.setValue(
      'computerUse.targetAllowlist',
      allowlist.filter((x) => x !== name),
      { shouldDirty: true }
    )
  }

  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          Computer Use lets the AI operate one window on your Mac with a virtual
          mouse and keyboard — it sees a screenshot each step and acts like a
          person. It needs a vision-capable AI model. It only touches windows
          you add to the allowlist below, you can stop it any time with ⌥⇧⎋, and
          every session is logged. Off by default.
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
          label="Allowlisted windows"
          description="Computer Use only touches windows whose title matches an entry here."
          layout="vertical"
        >
          {allowlist.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allowlist.map((name) => (
                <span
                  key={name}
                  className="border-border bg-muted/50 flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                >
                  {name}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${name}`}
                    onClick={() => removeTarget(name)}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Window title"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTarget()
                }
              }}
              data-testid={TEST_IDS.computerUse.allowlistInput}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTarget}
              data-testid={TEST_IDS.computerUse.addTargetButton}
            >
              Add
            </Button>
          </div>
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
                onChange={(e) => field.onChange(Number(e.target.value))}
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
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </SettingsRow>
          )}
        />
      </SettingsSection>
    </>
  )
}
