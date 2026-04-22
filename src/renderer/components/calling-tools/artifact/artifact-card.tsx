import { CodeIcon, MaximizeIcon, MinimizeIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  checkFullScreen,
  subscribeFullScreenChanged,
  unsubscribeFullScreenChanged
} from '@/lib/ipc'

interface ArtifactDetails {
  type: 'artifact'
  title: string
  code: string
  artifactId: string
  chatId: string
}

function getArtifactSandboxUrl(): string {
  const devUrl = import.meta.env.ELECTRON_RENDERER_URL as string | undefined
  if (import.meta.env.DEV && devUrl) {
    return `${devUrl}/sub-apps/artifacts/index.html`
  }
  return '../sub-apps/artifacts/index.html'
}

function sendToIframe(
  iframe: HTMLIFrameElement | null,
  code: string,
  title: string
) {
  const win = iframe?.contentWindow
  if (!win || !code) return
  const theme = window.localStorage.getItem('vite-ui-theme') ?? 'system'
  win.postMessage({ type: 'theme', theme }, '*')
  win.postMessage({ type: 'render', code, artifactId: title }, '*')
}

/** Track whether the Electron window is in macOS native fullscreen */
function useIsNativeFullscreen() {
  const [isFs, setIsFs] = useState(false)

  useEffect(() => {
    checkFullScreen().then((v: boolean) => setIsFs(v))
    const handler = (_: unknown, v: boolean) => setIsFs(v)
    subscribeFullScreenChanged(handler)
    return () => unsubscribeFullScreenChanged(handler)
  }, [])

  return isFs
}

export function ArtifactCard({ toolResult }: { toolResult: ArtifactDetails }) {
  const inlineIframeRef = useRef<HTMLIFrameElement>(null)
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null)
  const inlineReady = useRef(false)
  const fullscreenReady = useRef(false)
  const [expanded, setExpanded] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const isNativeFullscreen = useIsNativeFullscreen()

  // When inline iframe loads, mark ready and send code
  const handleInlineLoad = useCallback(() => {
    inlineReady.current = true
    sendToIframe(inlineIframeRef.current, toolResult.code, toolResult.title)
  }, [toolResult.code, toolResult.title])

  // When fullscreen iframe loads, mark ready and send code
  const handleFullscreenLoad = useCallback(() => {
    fullscreenReady.current = true
    sendToIframe(fullscreenIframeRef.current, toolResult.code, toolResult.title)
  }, [toolResult.code, toolResult.title])

  // Re-send code whenever toolResult changes (covers streaming updates)
  useEffect(() => {
    if (inlineReady.current) {
      sendToIframe(inlineIframeRef.current, toolResult.code, toolResult.title)
    }
  }, [toolResult.code, toolResult.title])

  // Re-send to fullscreen iframe when code changes
  useEffect(() => {
    if (fullscreenReady.current && expanded) {
      sendToIframe(
        fullscreenIframeRef.current,
        toolResult.code,
        toolResult.title
      )
    }
  }, [toolResult.code, toolResult.title, expanded])

  // Reset fullscreen ready when closing
  useEffect(() => {
    if (!expanded) fullscreenReady.current = false
  }, [expanded])

  // Close fullscreen on Escape
  useEffect(() => {
    if (!expanded) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [expanded])

  const toolbar = (
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
        title={expanded ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
      >
        {expanded ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
      </Button>
    </div>
  )

  const codePreview = showCode && (
    <pre className="bg-muted/50 max-h-60 overflow-auto border-b p-3 text-xs">
      <code>{toolResult.code}</code>
    </pre>
  )

  return (
    <>
      <Card
        className="overflow-hidden"
        style={expanded ? { display: 'none' } : undefined}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {toolResult.title}
          </CardTitle>
          {toolbar}
        </CardHeader>
        <CardContent className="p-0">
          {!expanded && codePreview}
          <iframe
            ref={inlineIframeRef}
            src={getArtifactSandboxUrl()}
            onLoad={handleInlineLoad}
            className="w-full border-0"
            style={{
              height: '400px',
              display: expanded ? 'none' : undefined
            }}
            sandbox="allow-scripts allow-same-origin"
            title={toolResult.title}
          />
        </CardContent>
      </Card>

      {expanded &&
        createPortal(
          <div className="bg-background fixed inset-0 z-50 flex flex-col">
            {/* When Electron is NOT native fullscreen, offset for macOS traffic lights (pl-20 pt-1).
                When native fullscreen, traffic lights move into the menu bar so no offset needed (pl-4). */}
            <div
              className="flex items-center justify-between border-b pr-4"
              style={{
                paddingLeft: isNativeFullscreen ? 16 : 88,
                paddingTop: isNativeFullscreen ? 8 : 9.5,
                paddingBottom: 8
              }}
            >
              <span className="text-sm font-medium">{toolResult.title}</span>
              {toolbar}
            </div>
            {codePreview}
            <iframe
              ref={fullscreenIframeRef}
              src={getArtifactSandboxUrl()}
              onLoad={handleFullscreenLoad}
              className="w-full flex-1 border-0"
              sandbox="allow-scripts allow-same-origin"
              title={toolResult.title}
            />
          </div>,
          document.body
        )}
    </>
  )
}
