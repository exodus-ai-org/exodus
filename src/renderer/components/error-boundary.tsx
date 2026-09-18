import { AlertTriangleIcon, RotateCcwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'

import { cn } from '@/lib/utils'

import { Button } from './ui/button'

export function RouteErrorBoundary() {
  const { t } = useTranslation('errors')
  const error = useRouteError()
  const navigate = useNavigate()

  let title = t('routeBoundary.title')
  let description = t('routeBoundary.description')

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`
    description =
      error.data?.toString() ?? t('routeBoundary.fallbackDescription')
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
          {t('routeBoundary.backToHome')}
        </Button>
        <Button onClick={() => window.location.reload()}>
          <RotateCcwIcon className="mr-1.5" />
          {t('routeBoundary.reload')}
        </Button>
      </div>
    </div>
  )
}
