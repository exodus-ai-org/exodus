import { getStaticToolName } from 'ai'
import { memo } from 'react'
import { DeepResearchCard } from './calling-tools/deep-research/deep-research-card'
import { GoogleMapsPlacesCard } from './calling-tools/google-maps-places/places-card'
import { GoogleMapsCard } from './calling-tools/google-maps-routing/routing-card'
import { WeatherCard } from './calling-tools/weather/weather-card'
import { WebSearchCard } from './calling-tools/web-search/web-search-card'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CallingTools({ toolInvocation }: { toolInvocation: any }) {
  if (toolInvocation.state !== 'output-available') return null

  const toolName = getStaticToolName(toolInvocation)
  const output = toolInvocation.output

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
      {(toolName === 'imageGeneration' ||
        toolName === 'date' ||
        toolName === 'rag' ||
        toolName === 'calculator') && <div className="-mb-4" />}
    </section>
  )
}

export const MessageCallingTools = memo(
  CallingTools,
  (prevProps, nextProps) => {
    return prevProps.toolInvocation.state === nextProps.toolInvocation.state
  }
)
