import { Maximize, Minus, Plus } from 'lucide-react'

import {
  Panel,
  useReactFlow,
  useStore,
  useViewport,
  type PanelProps
} from '@xyflow/react'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

export function ZoomSlider({
  className,
  ...props
}: Omit<PanelProps, 'children'>) {
  const { zoom } = useViewport()
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow()
  const minZoom = useStore((state) => state.minZoom)
  const maxZoom = useStore((state) => state.maxZoom)

  return (
    <Panel
      className={cn(
        'bg-primary-foreground text-foreground flex gap-1 rounded-md p-1',
        className
      )}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomOut({ duration: 300 })}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Slider
        className="flex w-[100px]! shrink-0"
        value={[zoom]}
        min={minZoom}
        max={maxZoom}
        step={0.01}
        onValueChange={(v) => zoomTo(Array.isArray(v) ? v[0] : v)}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomIn({ duration: 300 })}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        className={cn('tabular-nums')}
        variant="ghost"
        onClick={() => zoomTo(1, { duration: 300 })}
      >
        {(100 * zoom).toFixed(0)}%
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fitView({ duration: 300 })}
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </Panel>
  )
}
