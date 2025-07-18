import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { UseFormReturnType } from '@shared/schemas/settings-schema'

export function DeepResearch({ form }: { form: UseFormReturnType }) {
  return (
    <div className="flex flex-col gap-3">
      <FormField
        control={form.control}
        name="deepResearch.breadth"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <div className="flex justify-between">
              <FormLabel className="mb-0">Breadth</FormLabel>
              <FormControl className="w-fit">
                <Input
                  type="number"
                  id="max-steps-input"
                  autoFocus
                  {...field}
                  value={field.value ?? 4}
                />
              </FormControl>
            </div>
            <FormDescription>
              The breadth is to generate multiple search queries to explore
              different aspects of your topic at each level. By default, it is
              set to 4.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <Separator />
      <FormField
        control={form.control}
        name="deepResearch.depth"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <div className="flex justify-between">
              <FormLabel className="mb-0">Depth</FormLabel>
              <FormControl className="w-fit">
                <Input
                  type="number"
                  id="max-steps-input"
                  autoFocus
                  {...field}
                  value={field.value ?? 2}
                />
              </FormControl>
            </div>
            <FormDescription>
              The depth is to recursively dives deeper, following leads and
              uncovering connections for each branch. By default, it is set to
              2.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
