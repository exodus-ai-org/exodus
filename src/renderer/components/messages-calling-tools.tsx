import { ToolInvocation } from 'ai'
import { memo } from 'react'
import { GoogleMaps } from './calling-tools/google-maps'
import { Weather } from './calling-tools/weather'

function CallingTools({ toolInvocation }: { toolInvocation: ToolInvocation }) {
  if (toolInvocation.state !== 'result') return null

  return (
    <section className="mb-4">
      {toolInvocation.toolName === 'googleMapsRouting' && (
        <GoogleMaps toolResult={toolInvocation.result} />
      )}
      {toolInvocation.toolName === 'weather' && (
        <Weather toolResult={toolInvocation.result} />
      )}
    </section>
  )
}

export const MessageCallingTools = memo(
  CallingTools,
  (prevProps, nextProps) => {
    if (prevProps.toolInvocation.state === nextProps.toolInvocation.state) {
      return true
    }

    return true
  }
)
