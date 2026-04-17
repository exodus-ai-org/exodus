import { session } from 'electron'

import { logger } from './logger'

/**
 * Apply a proxy URL to the Electron session and process.env.
 *
 * Electron's session.setProxy routes ALL Chromium-level network requests
 * (fetch, net.request, etc.) through the proxy — this covers the main
 * process HTTP clients used by AI providers, MCP, web search, etc.
 *
 * We also set process.env vars as a fallback for any Node.js-native
 * HTTP clients (e.g. node:http used by some dependencies).
 *
 * Pass an empty string or nullish to clear the proxy.
 */
export async function applyProxy(
  proxyUrl: string | null | undefined
): Promise<void> {
  const url = proxyUrl?.trim() || ''

  if (url) {
    // Electron session proxy — covers all Chromium network stack
    await session.defaultSession.setProxy({
      proxyRules: url,
      proxyBypassRules: 'localhost,127.0.0.1'
    })

    // process.env fallback for Node.js native HTTP clients
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
    await session.defaultSession.setProxy({ proxyRules: '' })

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
