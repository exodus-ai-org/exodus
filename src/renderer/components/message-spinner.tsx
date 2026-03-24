import { Skeleton } from '@/components/ui/skeleton'

export function MessageSpinner() {
  return (
    <div className="flex items-center justify-start gap-2 p-2">
      <Skeleton className="size-2 rounded-full" />
      <Skeleton className="size-2 rounded-full" />
      <Skeleton className="size-2 rounded-full" />
    </div>
  )
}
