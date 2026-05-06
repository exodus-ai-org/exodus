import { ExternalLinkIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

/**
 * Output shape returned by the draw.io MCP servers (both the local
 * `@drawio/mcp` Tool Server and the hosted `mcp.draw.io/mcp` App Server).
 * Either `mermaid`, `xml`, or `csv` carries the diagram source. The `_version`
 * tag (e.g. `drawio-mcp-2026-05-06T...`) is what we use to identify the
 * payload as a draw.io tool result regardless of the calling tool name.
 */
export interface DrawioToolOutput {
  mermaid?: string | null
  xml?: string | null
  csv?: string | null
  _version?: string
}

export function isDrawioOutput(output: unknown): output is DrawioToolOutput {
  if (!output || typeof output !== 'object') return false
  const o = output as Record<string, unknown>
  const versioned =
    typeof o._version === 'string' && o._version.startsWith('drawio-')
  const hasSource =
    typeof o.mermaid === 'string' ||
    typeof o.xml === 'string' ||
    typeof o.csv === 'string'
  return versioned && hasSource
}

type DiagramFormat = 'mermaid' | 'xml' | 'csv'

function pickSource(
  output: DrawioToolOutput
): { format: DiagramFormat; data: string } | null {
  if (output.mermaid) return { format: 'mermaid', data: output.mermaid }
  if (output.xml) return { format: 'xml', data: output.xml }
  if (output.csv) return { format: 'csv', data: output.csv }
  return null
}

/**
 * `embed=1&proto=json` puts draw.io into postMessage mode: the iframe sends
 * `{event: 'init'}` once it's ready, after which we send a `load` action with
 * the diagram source. This avoids URL-length limits and works identically for
 * mermaid/xml/csv. `ui=min&spin=1` strips the editor chrome down to a viewer
 * with a small loading spinner; toolbar/menus stay accessible if the user
 * wants to edit. Keep `libraries=0&saveAndExit=0` so the iframe doesn't try
 * to phone home for shape libraries we won't use here. `dark=` is read on
 * iframe load only — re-mount via React `key` when the app theme flips.
 */
function buildEmbedUrl(dark: boolean): string {
  return `https://embed.diagrams.net/?embed=1&proto=json&ui=min&spin=1&libraries=0&saveAndExit=0&noSaveBtn=1&noExitBtn=1&dark=${dark ? 1 : 0}`
}

export function DrawioCard({ output }: { output: DrawioToolOutput }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState<string | null>(null)
  const source = pickSource(output)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    if (!source) return
    const handler = (e: MessageEvent) => {
      // Only react to messages from our iframe (origin is embed.diagrams.net,
      // but contentWindow comparison is the strict check).
      if (e.source !== iframeRef.current?.contentWindow) return
      let data: { event?: string } | null = null
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
      } catch {
        return
      }
      if (!data?.event) return
      if (data.event === 'init') {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            action: 'load',
            autosave: 0,
            descriptor: { format: source.format, data: source.data }
          }),
          '*'
        )
      } else if (data.event === 'configure') {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'configure' }),
          '*'
        )
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [source])

  if (!source) {
    return (
      <div className="text-muted-foreground rounded-lg border p-3 text-xs">
        Draw.io tool returned no diagram source.
      </div>
    )
  }

  // The hosted draw.io editor opens any diagram passed via the `#R<base64>`
  // fragment for XML, but mermaid/csv require the `#create=` JSON fragment.
  // Build a `create` URL for the "Open in draw.io" button so the user can pop
  // out the same diagram into the full editor.
  const openUrl = (() => {
    const payload = {
      type: source.format,
      compressed: false,
      data: source.data
    }
    return `https://app.diagrams.net/?ui=min#create=${encodeURIComponent(JSON.stringify(payload))}`
  })()

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
        <span className="text-muted-foreground text-xs font-medium">
          draw.io · {source.format}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          render={
            <a href={openUrl} target="_blank" rel="noopener noreferrer" />
          }
        >
          Open in draw.io
          <ExternalLinkIcon className="ml-1 size-3" />
        </Button>
      </div>
      <iframe
        // Re-mount on theme switch so drawio re-reads the `dark` query param
        // — drawio doesn't support runtime theme changes via postMessage.
        key={isDark ? 'dark' : 'light'}
        ref={iframeRef}
        src={buildEmbedUrl(isDark)}
        title="draw.io diagram"
        onError={() => setError('Failed to load draw.io editor')}
        className="block h-[420px] w-full"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
      {error && (
        <p className="text-destructive border-t px-3 py-2 text-xs">{error}</p>
      )}
    </div>
  )
}
