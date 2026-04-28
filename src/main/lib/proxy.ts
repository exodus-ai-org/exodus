import {
  ProxyAgent,
  setGlobalDispatcher,
  getGlobalDispatcher,
  Agent
} from 'undici'

import { logger } from './logger'

let originalDispatcher: InstanceType<typeof Agent> | null = null

/**
 * Apply a proxy URL to Node.js fetch via undici's global dispatcher.
 *
 * In Electron's main process, `fetch()` uses Node.js's undici under the hood.
 * `session.setProxy()` only covers the renderer (Chromium) network stack,
 * NOT main-process fetch calls used by AI providers, MCP, web search, etc.
 *
 * Setting a ProxyAgent as the global dispatcher ensures ALL `fetch()` calls
 * in the main process are routed through the proxy.
 *
 * Proxy is controlled exclusively via Settings → General.
 */
export function applyProxy(proxyUrl: string | null | undefined): void {
  const url = proxyUrl?.trim() || ''

  if (url) {
    // Save original dispatcher so we can restore it later
    if (!originalDispatcher) {
      originalDispatcher = getGlobalDispatcher() as InstanceType<typeof Agent>
    }

    const agent = new ProxyAgent({
      uri: url,
      requestTls: { rejectUnauthorized: true }
    })
    setGlobalDispatcher(agent)

    // Also set env vars for any child processes or native modules
    process.env.http_proxy = url
    process.env.HTTP_PROXY = url
    process.env.https_proxy = url
    process.env.HTTPS_PROXY = url
    process.env.all_proxy = url
    process.env.ALL_PROXY = url
    process.env.no_proxy = 'localhost,127.0.0.1'
    process.env.NO_PROXY = 'localhost,127.0.0.1'

    logger.info('app', 'Proxy configured', { proxy: url })
  } else {
    // Restore original dispatcher
    if (originalDispatcher) {
      setGlobalDispatcher(originalDispatcher)
      originalDispatcher = null
    }

    delete process.env.http_proxy
    delete process.env.HTTP_PROXY
    delete process.env.https_proxy
    delete process.env.HTTPS_PROXY
    delete process.env.all_proxy
    delete process.env.ALL_PROXY
    delete process.env.no_proxy
    delete process.env.NO_PROXY

    logger.info('app', 'Proxy cleared')
  }
}
