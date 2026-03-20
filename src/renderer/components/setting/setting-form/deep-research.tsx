import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Controller } from 'react-hook-form'
import { SettingRow, SettingSection } from '../setting-row'

export function DeepResearch({ form }: { form: UseFormReturnType }) {
  return (
    <SettingSection>
      <Controller
        control={form.control}
        name="deepResearch.breadth"
        render={({ field, fieldState }) => (
          <SettingRow
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
          </SettingRow>
        )}
      />
      <Controller
        control={form.control}
        name="deepResearch.depth"
        render={({ field, fieldState }) => (
          <SettingRow
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
          </SettingRow>
        )}
      />
    </SettingSection>
  )
}
