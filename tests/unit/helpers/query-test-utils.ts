import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * Renders `node` inside a fresh, isolated `QueryClient` (retry disabled —
 * a test asserting an error path shouldn't wait through React Query's
 * default backoff) for a hook/component test. Each call gets its own
 * client and DOM host, so tests never leak cache state between each other.
 */
export async function renderWithQueryClient(
  node: ReactNode
): Promise<{ host: HTMLDivElement; queryClient: QueryClient }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  const host = document.createElement('div')
  await act(async () => {
    createRoot(host).render(
      createElement(QueryClientProvider, { client: queryClient }, node)
    )
  })
  return { host, queryClient }
}
