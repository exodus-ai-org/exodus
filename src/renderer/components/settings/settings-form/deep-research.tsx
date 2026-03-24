import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { Controller } from 'react-hook-form'

import { Input } from '@/components/ui/input'

import { SettingsRow, SettingsSection } from '../settings-row'

export function DeepResearch({ form }: { form: UseFormReturnType }) {
  return (
    <SettingsSection>
      <Controller
        control={form.control}
        name="deepResearch.breadth"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Breadth"
            description="Generate multiple search queries to explore different aspects of your topic at each level. Default: 4."
            error={fieldState.error}
          >
            <Input
              placeholder="4"
              type="number"
              id="deep-research-breadth-input"
              autoFocus
              {...field}
              value={field.value ?? ''}
              className="w-fit"
            />
          </SettingsRow>
        )}
      />
      <Controller
        control={form.control}
        name="deepResearch.depth"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Depth"
            description="Recursively dive deeper, following leads and uncovering connections for each branch. Default: 2."
            error={fieldState.error}
          >
            <Input
              placeholder="2"
              type="number"
              id="deep-research-depth-input"
              {...field}
              value={field.value ?? ''}
              className="w-fit"
            />
          </SettingsRow>
        )}
      />
    </SettingsSection>
  )
}
