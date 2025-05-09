import { ToolInvocation } from 'ai'
import { memo } from 'react'
import { DeepResearchCard } from './calling-tools/deep-reseach/deep-research-card'
import { GoogleMapsPlacesCard } from './calling-tools/google-maps-places/places-card'
import { GoogleMapsCard } from './calling-tools/google-maps-routing/routing-card'
import { WeatherCard } from './calling-tools/weather/weather-card'
import { WebSearchCard } from './calling-tools/web-search/web-search-card'

function CallingTools({ toolInvocation }: { toolInvocation: ToolInvocation }) {
  if (toolInvocation.state !== 'result') return null

  return (
    <section className="mb-4">
      {toolInvocation.toolName === 'googleMapsRouting' && (
        <GoogleMapsCard toolResult={toolInvocation.result} />
      )}
      {toolInvocation.toolName === 'googleMapsPlaces' && (
        <GoogleMapsPlacesCard toolResult={toolInvocation.result} />
      )}
      {toolInvocation.toolName === 'weather' && (
        <WeatherCard toolResult={toolInvocation.result} />
      )}
      {toolInvocation.toolName === 'webSearch' && (
        <WebSearchCard toolResult={toolInvocation.result} />
      )}
      {toolInvocation.toolName === 'imageGeneration' && (
        <div className="-mb-4" />
      )}
      {toolInvocation.toolName === 'deepResearch' && (
        <DeepResearchCard toolResult={toolInvocation.result} />
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
