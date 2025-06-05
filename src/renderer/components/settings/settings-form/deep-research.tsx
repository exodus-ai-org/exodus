import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { TooltipArrow } from '@radix-ui/react-tooltip'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { Info } from 'lucide-react'

export function DeepResearch({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <FormField
        control={form.control}
        name="deepResearch.breadth"
        render={({ field }) => (
          <FormItem className="flex justify-between">
            <FormLabel>
              Breadth
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="text-ring h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-60">
                      The breadth is to generate multiple search queries to
                      explore different aspects of your topic at each level. By
                      default, it is set to 4.
                    </p>
                    <TooltipArrow className="TooltipArrow" />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </FormLabel>
            <FormControl className="w-fit">
              <Input
                type="number"
                id="max-steps-input"
                autoFocus
                {...field}
                value={field.value ?? 4}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Separator className="-my-2" />
      <FormField
        control={form.control}
        name="deepResearch.depth"
        render={({ field }) => (
          <FormItem className="flex justify-between">
            <FormLabel>
              Depth
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="text-ring h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-60">
                      The depth is to recursively dives deeper, following leads
                      and uncovering connections for each branch. By default, it
                      is set to 2.
                    </p>
                    <TooltipArrow className="TooltipArrow" />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </FormLabel>
            <FormControl className="w-fit">
              <Input
                type="number"
                id="max-steps-input"
                autoFocus
                {...field}
                value={field.value ?? 2}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
