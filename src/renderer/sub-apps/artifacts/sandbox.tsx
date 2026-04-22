import * as Motion from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import * as Recharts from 'recharts'
import { transform } from 'sucrase'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const MODULE_REGISTRY: Record<string, unknown> = {
  react: React,
  recharts: Recharts,
  'lucide-react': LucideIcons,
  'framer-motion': Motion,
  '@/ui/button': { Button },
  '@/ui/card': { Card, CardContent, CardHeader, CardTitle },
  '@/ui/badge': { Badge },
  '@/ui/table': {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  },
  '@/ui/tabs': { Tabs, TabsContent, TabsList, TabsTrigger }
}

function artifactRequire(moduleId: string): unknown {
  const resolved = MODULE_REGISTRY[moduleId]
  if (resolved !== undefined) {
    return resolved
  }
  console.warn(`[artifact-sandbox] Unknown module requested: "${moduleId}"`)
  return {}
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback: (error: Error) => React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[artifact-sandbox] Render error:', error, info)
  }

  override render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error)
    }
    return this.props.children
  }
}

interface ArtifactMessage {
  type: 'render'
  code: string
  artifactId: string
}

function isArtifactMessage(data: unknown): data is ArtifactMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as ArtifactMessage).type === 'render' &&
    typeof (data as ArtifactMessage).code === 'string' &&
    typeof (data as ArtifactMessage).artifactId === 'string'
  )
}

// NOTE: new Function() is used intentionally here. The artifact sandbox's
// purpose is to render LLM-generated React components inside an isolated
// iframe. This is a known, documented security trade-off for the feature.

export function ArtifactSandbox() {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  const handleMessage = useCallback((event: MessageEvent) => {
    const { data } = event

    // Handle theme sync from parent
    if (data?.type === 'theme' && typeof data.theme === 'string') {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      if (data.theme === 'system') {
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(sys)
      } else {
        root.classList.add(data.theme)
      }
      return
    }

    if (!isArtifactMessage(data)) return

    try {
      const { code: transformed } = transform(data.code, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic'
      })

      const moduleExports: Record<string, unknown> = {}
      const moduleObj = { exports: moduleExports }

      // Wrap in IIFE so the LLM's `const React = require('react')` etc.
      // live in their own scope and don't clash with our outer bindings.
      const wrapped =
        '(function(require, exports, module) {\n' +
        transformed +
        '\n})(require, exports, module);'

      const factory = new Function('require', 'exports', 'module', wrapped)
      factory(artifactRequire, moduleExports, moduleObj)

      const exported =
        (moduleObj.exports as Record<string, unknown>).default ||
        moduleObj.exports

      if (typeof exported !== 'function') {
        setError('Artifact code did not export a valid React component.')
        setComponent(null)
        return
      }

      setError(null)
      setComponent(() => exported as React.ComponentType)
      setKey((k) => k + 1)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown transpile/eval error'
      console.error('[artifact-sandbox] Transpile/eval error:', err)
      setError(message)
      setComponent(null)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  if (error) {
    return (
      <div className="p-4">
        <p className="text-destructive font-mono text-sm">{error}</p>
      </div>
    )
  }

  if (!Component) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Waiting for artifact...</p>
      </div>
    )
  }

  return (
    <ErrorBoundary
      key={key}
      fallback={(err) => (
        <div className="p-4">
          <p className="text-destructive font-mono text-sm">{err.message}</p>
        </div>
      )}
    >
      <div className="p-4">
        <Component />
      </div>
    </ErrorBoundary>
  )
}
