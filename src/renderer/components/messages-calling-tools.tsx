import type { ChatToolResultMessage } from '@shared/types/chat'
import { memo } from 'react'
import { DeepResearchCard } from './calling-tools/deep-research/deep-research-card'
import { GoogleMapsPlacesCard } from './calling-tools/google-maps-places/places-card'
import { GoogleMapsCard } from './calling-tools/google-maps-routing/routing-card'
import { TerminalCard } from './calling-tools/terminal/terminal-card'
import { WeatherCard } from './calling-tools/weather/weather-card'
import { WebSearchCard } from './calling-tools/web-search/web-search-card'

function CallingTools({ toolResult }: { toolResult: ChatToolResultMessage }) {
  const toolName = toolResult.toolName

  // details comes from DB directly; fallback to parsing content text for compatibility
  const output =
    toolResult.details ??
    (() => {
      const textBlock = toolResult.content.find((c) => c.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        try {
          const parsed = JSON.parse(textBlock.text)
          // Unwrap legacy AgentToolResult wrapper if present
          if (
            parsed &&
            typeof parsed === 'object' &&
            'details' in parsed &&
            'content' in parsed
          ) {
            return parsed.details
          }
          return parsed
        } catch {
          return textBlock.text
        }
      }
      return null
    })()

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
    return (
      prevProps.toolResult.toolCallId === nextProps.toolResult.toolCallId &&
      prevProps.toolResult.isError === nextProps.toolResult.isError
    )
  }
)
