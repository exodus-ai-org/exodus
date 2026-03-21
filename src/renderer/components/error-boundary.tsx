import { AlertTriangleIcon, RotateCcwIcon } from 'lucide-react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'

import { cn } from '@/lib/utils'

import { Button } from './ui/button'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  let title = 'Something went wrong'
  let description = 'An unexpected error occurred.'

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`
    description = error.data?.toString() ?? 'The page could not be loaded.'
  } else if (error instanceof Error) {
    description = error.message
  }

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-6 p-8',
        'text-center'
      )}
    >
      <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
        <AlertTriangleIcon
          className="text-destructive size-8"
          strokeWidth={1.5}
        />
      </div>

      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Home
        </Button>
        <Button onClick={() => window.location.reload()}>
          <RotateCcwIcon className="mr-1.5" />
          Reload
        </Button>
      </div>
    </div>
  )
}
