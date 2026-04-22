import { CodeIcon, MaximizeIcon, MinimizeIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ArtifactDetails {
  type: 'artifact'
  title: string
  code: string
}

function getArtifactSandboxUrl(): string {
  const devUrl = import.meta.env.ELECTRON_RENDERER_URL as string | undefined
  if (import.meta.env.DEV && devUrl) {
    return `${devUrl}/sub-apps/artifacts/index.html`
  }
  return '../sub-apps/artifacts/index.html'
}

export function ArtifactCard({ toolResult }: { toolResult: ArtifactDetails }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)

  const sendCode = useCallback(() => {
    const win = iframeRef.current?.contentWindow
    if (!win || !toolResult.code) return

    // Send theme first so the sandbox can apply it before rendering
    const theme = window.localStorage.getItem('vite-ui-theme') ?? 'system'
    win.postMessage({ type: 'theme', theme }, '*')

    win.postMessage(
      {
        type: 'render',
        code: toolResult.code,
        artifactId: toolResult.title
      },
      '*'
    )
  }, [toolResult.code, toolResult.title])

  useEffect(() => {
    if (iframeReady) sendCode()
  }, [iframeReady, sendCode])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {toolResult.title}
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowCode(!showCode)}
            title={showCode ? 'Hide code' : 'Show code'}
          >
            <CodeIcon size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {showCode && (
          <pre className="bg-muted/50 max-h-60 overflow-auto border-b p-3 text-xs">
            <code>{toolResult.code}</code>
          </pre>
        )}
        <iframe
          ref={iframeRef}
          src={getArtifactSandboxUrl()}
          onLoad={() => setIframeReady(true)}
          className="w-full border-0"
          style={{ height: expanded ? '600px' : '400px' }}
          sandbox="allow-scripts allow-same-origin"
          title={toolResult.title}
        />
      </CardContent>
    </Card>
  )
}
