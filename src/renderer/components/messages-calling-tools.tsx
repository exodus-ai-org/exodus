import { ToolCallPart } from '@shared/types/chat'
import { memo } from 'react'
import { DeepResearchCard } from './calling-tools/deep-research/deep-research-card'
import { GoogleMapsPlacesCard } from './calling-tools/google-maps-places/places-card'
import { GoogleMapsCard } from './calling-tools/google-maps-routing/routing-card'
import { TerminalCard } from './calling-tools/terminal/terminal-card'
import { WeatherCard } from './calling-tools/weather/weather-card'
import { WebSearchCard } from './calling-tools/web-search/web-search-card'

function CallingTools({ toolInvocation }: { toolInvocation: ToolCallPart }) {
  if (toolInvocation.state !== 'done') return null

  const toolName = toolInvocation.toolName
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = toolInvocation.result as any

  return (
    <section className="mb-4">
      {toolName === 'googleMapsRouting' && (
        <GoogleMapsCard toolResult={output} />
      )}
      {toolName === 'googleMapsPlaces' && (
        <GoogleMapsPlacesCard toolResult={output} />
      )}
      {toolName === 'weather' && <WeatherCard toolResult={output} />}
      {toolName === 'webSearch' && <WebSearchCard toolResult={output} />}
      {toolName === 'deepResearch' && <DeepResearchCard toolResult={output} />}
      {toolName === 'terminal' && <TerminalCard toolResult={output} />}
      {(toolName === 'imageGeneration' ||
        toolName === 'date' ||
        toolName === 'rag' ||
        toolName === 'calculator' ||
        toolName === 'readFile' ||
        toolName === 'writeFile' ||
        toolName === 'listDirectory' ||
        toolName === 'findFiles') && <div className="-mb-4" />}
    </section>
  )
}

export const MessageCallingTools = memo(
  CallingTools,
  (prevProps, nextProps) => {
    return prevProps.toolInvocation.state === nextProps.toolInvocation.state
  }
)
