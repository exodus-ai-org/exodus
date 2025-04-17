import { ToolInvocation } from 'ai'
import { memo } from 'react'
import { GoogleMapView } from './calling-tools/google-map'

function CallingTools({ toolInvocation }: { toolInvocation: ToolInvocation }) {
  if (toolInvocation.state !== 'result') return null

  return (
    <section className="mb-4">
      {toolInvocation.toolName === 'googleMapRouting' && (
        <GoogleMapView data={JSON.parse(toolInvocation.result || '{}')} />
      )}
    </section>
  )
}

export const CallingToolsRenderer = memo(
  CallingTools,
  (prevProps, nextProps) => {
    if (prevProps.toolInvocation.state === nextProps.toolInvocation.state) {
      return true
    }

    return true
  }
)
