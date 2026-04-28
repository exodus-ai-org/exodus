import { artifactShortId, artifactSlug } from '@shared/utils/artifact-slug'
import { MaximizeIcon, MinimizeIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { sileo } from 'sileo'

import {
  checkFullScreen,
  revealArtifactFile,
  subscribeFullScreenChanged,
  unsubscribeFullScreenChanged
} from '@/lib/ipc'
import { cn } from '@/lib/utils'

interface ArtifactDetails {
  type: 'artifact'
  title: string
  code: string
  artifactId: string
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

/** Track whether the Electron window is in macOS native fullscreen. */
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

const TRAFFIC_LIGHT_COLORS = ['#ff5f57', '#febc2e', '#28c840']

function DecorativeTrafficLights() {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {TRAFFIC_LIGHT_COLORS.map((color) => (
        <span
          key={color}
          className="h-3 w-3 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12)'
          }}
        />
      ))}
    </div>
  )
}

function UrlPill({
  title,
  artifactId,
  chatId
}: {
  title: string
  artifactId: string
  chatId: string
}) {
  const slug = artifactSlug(title)
  const shortId = artifactShortId(artifactId)

  const handleClick = async () => {
    const result = (await revealArtifactFile(chatId, artifactId)) as
      | { ok: true; filePath: string }
      | { ok: false; reason: string }
      | undefined
    if (result && !result.ok) {
      sileo.error({
        title: 'Cannot open artifact file',
        description:
          result.reason === 'not-found'
            ? 'The saved .tsx file is missing — it may have been moved or deleted.'
            : 'Could not resolve the artifact path.'
      })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Reveal ${title} in file manager`}
      title="Reveal in file manager"
      className={cn(
        'min-w-0 max-w-160 flex-1 rounded-md border px-2.5 py-1 text-left font-mono text-[11.5px] leading-none',
        'border-border/60 bg-background text-muted-foreground transition-colors',
        'hover:bg-muted cursor-pointer'
      )}
    >
      <span className="mr-1 opacity-60">🔒</span>
      <span className="text-foreground/50">artifact://</span>
      <span className="truncate">
        {shortId}/{slug}
      </span>
    </button>
  )
}

function FullscreenButton({
  isFullscreen,
  onClick
}: {
  isFullscreen: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
      className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {isFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
    </button>
  )
}

function InlineChromeBar({
  title,
  artifactId,
  chatId,
  onEnterFullscreen
}: {
  title: string
  artifactId: string
  chatId: string
  onEnterFullscreen: () => void
}) {
  return (
    <div className="bg-muted/70 flex h-10 items-center gap-3 border-b px-3">
      <DecorativeTrafficLights />
      <div className="flex min-w-0 flex-1 justify-center">
        <UrlPill title={title} artifactId={artifactId} chatId={chatId} />
      </div>
      <FullscreenButton isFullscreen={false} onClick={onEnterFullscreen} />
    </div>
  )
}

function FullscreenChromeBar({
  title,
  artifactId,
  chatId,
  isNativeFullscreen,
  onExitFullscreen
}: {
  title: string
  artifactId: string
  chatId: string
  isNativeFullscreen: boolean
  onExitFullscreen: () => void
}) {
  // When Electron is NOT in macOS native fullscreen, the OS traffic lights sit
  // at the top-left of our window — pad our chrome content to 88px to avoid
  // collision. When native-fullscreen, the OS lights move into the menu bar so
  // we can start at normal padding.
  const leftPadding = isNativeFullscreen ? 16 : 88

  return (
    <div
      className="bg-muted/70 flex h-10 items-center gap-3 border-b pr-3"
      style={{ paddingLeft: leftPadding }}
    >
      <div className="flex min-w-0 flex-1 justify-center">
        <UrlPill title={title} artifactId={artifactId} chatId={chatId} />
      </div>
      <FullscreenButton isFullscreen={true} onClick={onExitFullscreen} />
    </div>
  )
}

export function ArtifactCard({
  chatId,
  toolResult
}: {
  chatId: string
  toolResult: ArtifactDetails
}) {
  const inlineIframeRef = useRef<HTMLIFrameElement>(null)
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null)
  const inlineReady = useRef(false)
  const fullscreenReady = useRef(false)
  const codeRef = useRef(toolResult.code)
  const titleRef = useRef(toolResult.title)
  const [expanded, setExpanded] = useState(false)
  const isNativeFullscreen = useIsNativeFullscreen()

  // Keep refs current so the message listener (attached once) always reads
  // the latest code/title when responding to a sandbox ready handshake.
  useEffect(() => {
    codeRef.current = toolResult.code
    titleRef.current = toolResult.title
  }, [toolResult.code, toolResult.title])

  // Listen for the sandbox ready handshake from each iframe and send the
  // render message in response. Fixes a race where the parent's `onLoad`
  // fired before the sandbox attached its message listener, dropping the
  // initial render message and stranding the UI on "Waiting for artifact…".
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        typeof event.data !== 'object' ||
        event.data === null ||
        (event.data as { type?: unknown }).type !== 'artifact-sandbox-ready'
      ) {
        return
      }
      if (event.source === inlineIframeRef.current?.contentWindow) {
        inlineReady.current = true
        sendToIframe(inlineIframeRef.current, codeRef.current, titleRef.current)
      } else if (event.source === fullscreenIframeRef.current?.contentWindow) {
        fullscreenReady.current = true
        sendToIframe(
          fullscreenIframeRef.current,
          codeRef.current,
          titleRef.current
        )
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Re-send on streaming code/title updates (iframes already mounted).
  useEffect(() => {
    if (inlineReady.current) {
      sendToIframe(inlineIframeRef.current, toolResult.code, toolResult.title)
    }
  }, [toolResult.code, toolResult.title])

  useEffect(() => {
    if (fullscreenReady.current && expanded) {
      sendToIframe(
        fullscreenIframeRef.current,
        toolResult.code,
        toolResult.title
      )
    }
  }, [toolResult.code, toolResult.title, expanded])

  // Fullscreen iframe unmounts on exit — reset its ready flag so the next
  // mount's handshake re-triggers a render.
  useEffect(() => {
    if (!expanded) fullscreenReady.current = false
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [expanded])

  return (
    <>
      <div
        className="border-border/70 bg-card overflow-hidden rounded-lg border shadow-sm"
        style={expanded ? { display: 'none' } : undefined}
      >
        <InlineChromeBar
          title={toolResult.title}
          artifactId={toolResult.artifactId}
          chatId={chatId}
          onEnterFullscreen={() => setExpanded(true)}
        />
        <iframe
          ref={inlineIframeRef}
          src={getArtifactSandboxUrl()}
          className="w-full border-0"
          style={{ height: '400px' }}
          sandbox="allow-scripts allow-same-origin"
          title={toolResult.title}
        />
      </div>

      {expanded &&
        createPortal(
          <div className="bg-background fixed inset-0 z-50 flex flex-col">
            <FullscreenChromeBar
              title={toolResult.title}
              artifactId={toolResult.artifactId}
              chatId={chatId}
              isNativeFullscreen={isNativeFullscreen}
              onExitFullscreen={() => setExpanded(false)}
            />
            <iframe
              ref={fullscreenIframeRef}
              src={getArtifactSandboxUrl()}
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
