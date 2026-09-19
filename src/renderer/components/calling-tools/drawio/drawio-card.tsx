import { ExternalLinkIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

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

// Mermaid diagram headers (optionally preceded by an `%%{init …}%%` directive).
const MERMAID_START_RE =
  /^\s*(?:%%\{[\s\S]*?\}%%\s*)?(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4Context|sankey-beta|xychart-beta|block-beta|packet-beta|kanban|architecture-beta)\b/

const DRAWIO_XML_START_RE = /^\s*<(?:\?xml|mxfile|mxGraphModel|diagram)\b/i

export function isDrawioOutput(output: unknown): output is DrawioToolOutput {
  if (!output || typeof output !== 'object') return false
  const o = output as Record<string, unknown>
  const mermaid = typeof o.mermaid === 'string' ? o.mermaid : null
  const xml = typeof o.xml === 'string' ? o.xml : null
  const csv = typeof o.csv === 'string' ? o.csv : null
  if (!mermaid && !xml && !csv) return false

  // The App Server tags results `drawio-mcp-…`; trust that outright.
  if (typeof o._version === 'string' && o._version.startsWith('drawio-')) {
    return true
  }
  // Some draw.io MCP servers omit `_version` — sniff the source so a bare
  // `{ mermaid }` / `{ xml }` payload still gets the canvas instead of being
  // dumped as raw JSON by GenericToolCard. `csv` alone is too ambiguous.
  if (mermaid && MERMAID_START_RE.test(mermaid)) return true
  if (xml && DRAWIO_XML_START_RE.test(xml)) return true
  return false
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
  const { t } = useTranslation('chat')
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
        {t('drawioCard.noSource')}
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
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('drawioCard.openInDrawio')}
            />
          }
        >
          {t('drawioCard.openInDrawio')}
          <ExternalLinkIcon className="ml-1 size-3" />
        </Button>
      </div>
      <iframe
        // Re-mount on theme switch so drawio re-reads the `dark` query param
        // — drawio doesn't support runtime theme changes via postMessage.
        key={isDark ? 'dark' : 'light'}
        ref={iframeRef}
        src={buildEmbedUrl(isDark)}
        title={t('drawioCard.iframeTitle')}
        onError={() => setError(t('drawioCard.loadFailed'))}
        className="block h-[420px] w-full"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
      {error && (
        <p className="text-destructive border-t px-3 py-2 text-xs">{error}</p>
      )}
    </div>
  )
}
