import { artifactShortId, artifactSlug } from '@shared/utils/artifact-slug'
import { MinusIcon, MaximizeIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { revealArtifactFile } from '@/lib/ipc'
import { cn } from '@/lib/utils'

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

type LightVariant = 'red' | 'yellow' | 'green'

const LIGHT_COLORS: Record<LightVariant, string> = {
  red: '#ff5f57',
  yellow: '#febc2e',
  green: '#28c840'
}

function TrafficLight({
  variant,
  onClick,
  ariaLabel,
  children
}: {
  variant: LightVariant
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="group relative flex h-3 w-3 items-center justify-center rounded-full transition-opacity focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none"
      style={{
        backgroundColor: LIGHT_COLORS[variant],
        boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12)'
      }}
    >
      <span className="pointer-events-none flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-60">
        {children}
      </span>
    </button>
  )
}

function UrlPill({
  title,
  artifactId,
  chatId,
  disabled
}: {
  title: string
  artifactId: string
  chatId: string
  disabled?: boolean
}) {
  const slug = artifactSlug(title)
  const shortId = artifactShortId(artifactId)

  const handleClick = () => {
    if (disabled) return
    revealArtifactFile(chatId, artifactId)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Reveal ${title} in file manager`}
      title={disabled ? title : `Reveal in file manager`}
      className={cn(
        'min-w-0 max-w-[640px] flex-1 rounded-md border px-2.5 py-1 text-left font-mono text-[11.5px] leading-none',
        'border-border/60 bg-background text-muted-foreground transition-colors',
        !disabled && 'hover:bg-muted cursor-pointer',
        disabled && 'opacity-60'
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

function ChromeBar({
  title,
  artifactId,
  chatId,
  onCollapse,
  onToggleCode,
  onToggleFullscreen
}: {
  title: string
  artifactId: string
  chatId: string
  onCollapse: () => void
  onToggleCode: () => void
  onToggleFullscreen: () => void
}) {
  return (
    <div className="bg-muted/70 flex h-10 items-center gap-3 border-b px-3">
      <div className="flex items-center gap-2">
        <TrafficLight
          variant="red"
          onClick={onCollapse}
          ariaLabel="Collapse artifact"
        >
          <XIcon size={8} strokeWidth={3} />
        </TrafficLight>
        <TrafficLight
          variant="yellow"
          onClick={onToggleCode}
          ariaLabel="Toggle code"
        >
          <MinusIcon size={8} strokeWidth={3} />
        </TrafficLight>
        <TrafficLight
          variant="green"
          onClick={onToggleFullscreen}
          ariaLabel="Toggle fullscreen"
        >
          <MaximizeIcon size={7} strokeWidth={3} />
        </TrafficLight>
      </div>
      <div className="flex min-w-0 flex-1 justify-center">
        <UrlPill title={title} artifactId={artifactId} chatId={chatId} />
      </div>
      <div className="w-[64px]" aria-hidden />
    </div>
  )
}

export function ArtifactCard({ toolResult }: { toolResult: ArtifactDetails }) {
  const inlineIframeRef = useRef<HTMLIFrameElement>(null)
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null)
  const inlineReady = useRef(false)
  const fullscreenReady = useRef(false)
  const [expanded, setExpanded] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleInlineLoad = useCallback(() => {
    inlineReady.current = true
    sendToIframe(inlineIframeRef.current, toolResult.code, toolResult.title)
  }, [toolResult.code, toolResult.title])

  const handleFullscreenLoad = useCallback(() => {
    fullscreenReady.current = true
    sendToIframe(fullscreenIframeRef.current, toolResult.code, toolResult.title)
  }, [toolResult.code, toolResult.title])

  useEffect(() => {
    if (inlineReady.current && !collapsed) {
      sendToIframe(inlineIframeRef.current, toolResult.code, toolResult.title)
    }
  }, [toolResult.code, toolResult.title, collapsed])

  useEffect(() => {
    if (fullscreenReady.current && expanded) {
      sendToIframe(
        fullscreenIframeRef.current,
        toolResult.code,
        toolResult.title
      )
    }
  }, [toolResult.code, toolResult.title, expanded])

  useEffect(() => {
    if (!expanded) fullscreenReady.current = false
  }, [expanded])

  useEffect(() => {
    if (collapsed) inlineReady.current = false
  }, [collapsed])

  useEffect(() => {
    if (!expanded) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [expanded])

  const inlineChrome = (
    <ChromeBar
      title={toolResult.title}
      artifactId={toolResult.artifactId}
      chatId={toolResult.chatId}
      onCollapse={() => setCollapsed((c) => !c)}
      onToggleCode={() => setShowCode((s) => !s)}
      onToggleFullscreen={() => setExpanded(true)}
    />
  )

  const codePreview = showCode && !collapsed && (
    <pre className="bg-muted/50 max-h-60 overflow-auto border-b p-3 text-xs">
      <code>{toolResult.code}</code>
    </pre>
  )

  return (
    <>
      <div
        className="border-border/70 bg-card overflow-hidden rounded-lg border shadow-sm"
        style={expanded ? { display: 'none' } : undefined}
      >
        {inlineChrome}
        {codePreview}
        {!collapsed && (
          <iframe
            ref={inlineIframeRef}
            src={getArtifactSandboxUrl()}
            onLoad={handleInlineLoad}
            className="w-full border-0"
            style={{ height: '400px' }}
            sandbox="allow-scripts allow-same-origin"
            title={toolResult.title}
          />
        )}
      </div>

      {expanded &&
        createPortal(
          <div className="bg-background fixed inset-0 z-50 flex flex-col">
            <ChromeBar
              title={toolResult.title}
              artifactId={toolResult.artifactId}
              chatId={toolResult.chatId}
              onCollapse={() => setExpanded(false)}
              onToggleCode={() => setShowCode((s) => !s)}
              onToggleFullscreen={() => setExpanded(false)}
            />
            {showCode && (
              <pre className="bg-muted/50 max-h-60 overflow-auto border-b p-3 text-xs">
                <code>{toolResult.code}</code>
              </pre>
            )}
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
