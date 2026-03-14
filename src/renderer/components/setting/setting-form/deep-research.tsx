import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Controller } from 'react-hook-form'

export function DeepResearch({ form }: { form: UseFormReturnType }) {
  return (
    <div className="flex flex-col gap-3">
      <Controller
        control={form.control}
        name="deepResearch.breadth"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex justify-between">
              <FieldLabel>Breadth</FieldLabel>
              <Input
                type="number"
                id="deep-research-breadth-input"
                autoFocus
                {...field}
                value={field.value ?? 4}
                className="w-fit"
              />
            </div>
            <FieldDescription>
              The breadth is to generate multiple search queries to explore
              different aspects of your topic at each level. By default, it is
              set to 4.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Separator />
      <Controller
        control={form.control}
        name="deepResearch.depth"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex justify-between">
              <FieldLabel>Depth</FieldLabel>
              <Input
                type="number"
                id="deep-research-depth-input"
                {...field}
                value={field.value ?? 2}
                className="w-fit"
              />
            </div>
            <FieldDescription>
              The depth is to recursively dives deeper, following leads and
              uncovering connections for each branch. By default, it is set to
              2.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  )
}
