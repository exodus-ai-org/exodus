import { zodResolver } from '@hookform/resolvers/zod'
import { Settings, SettingsSchema } from '@shared/schemas/settings-schema'
import { useAtomValue } from 'jotai'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'

import { useSettings } from '@/hooks/use-settings'
import { settingsLabelAtom } from '@/stores/settings'

import { DataControls } from './settings-form/data-controls'
import { DeepResearch } from './settings-form/deep-research'
import { General } from './settings-form/generals'
import { GraphRAG } from './settings-form/graph-rag'
import { KeyboardShortcuts } from './settings-form/keyboard-shortcuts'
import { Logger } from './settings-form/logger'
import { McpServers } from './settings-form/mcp-servers'
import { MemorySettings } from './settings-form/memory'
import { Personality } from './settings-form/personality'
import { Profile } from './settings-form/profile'
import { ProvidersTabs } from './settings-form/providers-tabs'
import { S3 } from './settings-form/s3'
import { Search } from './settings-form/search'
import { SkillsMarketSetting } from './settings-form/skills-market'
import { SystemInfo } from './settings-form/system-info'
import { Tools } from './settings-form/tools'
import { Voice } from './settings-form/voice'
import { SettingsLabel } from './settings-menu'
import { UnderConstruction } from './under-construction'

export function SettingsForm() {
  const { data: settings, updateSettings } = useSettings()
  const activeTitle = useAtomValue(settingsLabelAtom)

  const form = useForm({
    resolver: zodResolver(SettingsSchema),
    values: settings,
    resetOptions: { keepDirtyValues: true }
  })

  // Refs let the watch effect read latest closure without re-subscribing on
  // every render of the parent. The watch subscription must outlive the
  // section-tab swaps that re-render this component.
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const updateSettingsRef = useRef(updateSettings)
  updateSettingsRef.current = updateSettings

  // Auto-save: subscribe to any user-initiated value change (typed input,
  // Switch toggle, Select pick, programmatic setValue) and persist once the
  // schema validates. Debounced so a burst of keystrokes coalesces into one
  // write. Replaces the old `onBlur={handleSubmit(...)}` form handler, which
  // missed Switch/Select changes and fired spurious saves on tab switches.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const persist = (values: Settings) => {
      const current = settingsRef.current
      if (!current) return
      updateSettingsRef.current({ ...values, id: current.id })
    }
    const flush = () => {
      timeoutId = null
      // handleSubmit runs the Zod resolver; persist only fires for valid values.
      void form.handleSubmit(persist)()
    }
    const subscription = form.watch((values, { name }) => {
      // RHF emits a watch event with `name` undefined when the `values: settings`
      // prop hydrates the form on mount or when reset() is called — skip those
      // so loading from the DB doesn't immediately echo-save.
      if (!name) return
      // Echo guard: after a save, the server bumps `updatedAt` and refetches
      // through SWR. RHF then resets the form to the new values and emits a
      // watch event for the changed timestamp field, which would otherwise
      // trigger another save → infinite POST loop. Compare what we'd save
      // against the persisted settings; equal means there's nothing new.
      const current = settingsRef.current
      if (current && JSON.stringify(values) === JSON.stringify(current)) return
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(flush, 300)
    })
    return () => {
      subscription.unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
        // Flush any pending save when the component unmounts (navigating away
        // from /settings) so the last edit isn't dropped.
        flush()
      }
    }
  }, [form])

  return (
    <form className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8">
      <h1 className="text-xl">{activeTitle}</h1>

      {activeTitle === SettingsLabel.Profile && <Profile />}

      {activeTitle === SettingsLabel.General && <General form={form} />}

      {activeTitle === SettingsLabel.Personality && <Personality form={form} />}

      {activeTitle === SettingsLabel.AiProviders && (
        <ProvidersTabs form={form} />
      )}

      {activeTitle === SettingsLabel.AmazonS3 && <S3 form={form} />}

      {activeTitle === SettingsLabel.Voice && <Voice form={form} />}

      {activeTitle === SettingsLabel.DeepResearch && (
        <DeepResearch form={form} />
      )}

      {activeTitle === SettingsLabel.Memory && <MemorySettings form={form} />}

      {activeTitle === SettingsLabel.BuiltinTools && <Tools form={form} />}

      {activeTitle === SettingsLabel.SkillsMarket && <SkillsMarketSetting />}

      {activeTitle === SettingsLabel.McpServers && <McpServers />}

      {activeTitle === SettingsLabel.Search && <Search form={form} />}

      {activeTitle === SettingsLabel.GraphRag && <GraphRAG />}

      {activeTitle === SettingsLabel.ComputerUse && <UnderConstruction />}

      {activeTitle === SettingsLabel.DataControls && <DataControls />}

      {activeTitle === SettingsLabel.Logger && <Logger />}

      {activeTitle === SettingsLabel.KeyboardShortcuts && <KeyboardShortcuts />}

      {activeTitle === SettingsLabel.AboutExodus && <SystemInfo form={form} />}
    </form>
  )
}
