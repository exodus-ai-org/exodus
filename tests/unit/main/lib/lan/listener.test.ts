import { describe, expect, it, vi } from 'vitest'

vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

const { createLanListener } = await import('@main/lib/lan/listener')

function setup(state: { wanted: boolean }) {
  const server = { close: vi.fn(), once: vi.fn() }
  // Like @hono/node-server: returns at once, reports `listening` later.
  const serve = vi.fn((_options: unknown, onListening?: () => void) => {
    queueMicrotask(() => onListening?.())
    return server
  })
  const fetch = vi.fn(async () => new Response('ok'))
  const certificate = vi.fn(async () => ({
    certPem: 'CERT',
    keyPem: 'KEY',
    fingerprint: 'PIN'
  }))
  const listener = createLanListener({
    fetch,
    wanted: async () => state.wanted,
    certificate,
    serve: serve as never
  })
  return { listener, serve, server, fetch, certificate }
}

describe('LAN listener', () => {
  it('stays down — and creates no certificate — while nothing wants it', async () => {
    const { listener, serve, certificate } = setup({ wanted: false })
    await listener.sync()

    expect(serve).not.toHaveBeenCalled()
    expect(certificate).not.toHaveBeenCalled()
    expect(listener.isRunning()).toBe(false)
  })

  it('comes up over HTTPS on every interface when wanted, once', async () => {
    const { listener, serve } = setup({ wanted: true })
    await listener.sync()
    await listener.sync()

    expect(serve).toHaveBeenCalledTimes(1)
    expect(serve.mock.calls[0][0]).toMatchObject({
      port: 63129,
      hostname: '0.0.0.0',
      serverOptions: { cert: 'CERT', key: 'KEY' }
    })
    expect(listener.isRunning()).toBe(true)
  })

  it('does not start twice when two syncs overlap', async () => {
    const { listener, serve } = setup({ wanted: true })
    await Promise.all([listener.sync(), listener.sync(), listener.sync()])

    expect(serve).toHaveBeenCalledTimes(1)
  })

  it('tags what it serves as the lan listener', async () => {
    const { listener, serve, fetch } = setup({ wanted: true })
    await listener.sync()
    const served = serve.mock.calls[0][0] as unknown as {
      fetch(request: Request, env: unknown): Promise<Response>
    }
    await served.fetch(new Request('https://x/'), { incoming: {} })

    expect(fetch).toHaveBeenCalledWith(expect.any(Request), {
      incoming: {},
      listener: 'lan'
    })
  })

  it('goes down when the last reason to be up is gone, and can come back', async () => {
    const state = { wanted: true }
    const { listener, serve, server } = setup(state)
    await listener.sync()

    state.wanted = false
    await listener.sync()
    expect(server.close).toHaveBeenCalledTimes(1)
    expect(listener.isRunning()).toBe(false)

    state.wanted = true
    await listener.sync()
    expect(serve).toHaveBeenCalledTimes(2)
  })

  it('a failed sync does not wedge the next one', async () => {
    const state = { wanted: true }
    const { listener, serve, certificate } = setup(state)
    certificate.mockRejectedValueOnce(new Error('keychain locked'))

    await expect(listener.sync()).rejects.toThrow('keychain locked')
    await listener.sync()
    expect(serve).toHaveBeenCalledTimes(1)
  })

  it('reports a port it cannot bind as a failed sync, and stays down', async () => {
    const { listener, serve, server } = setup({ wanted: true })
    serve.mockImplementationOnce(() => {
      server.once.mockImplementationOnce(
        (_event: string, fail: (error: Error) => void) =>
          queueMicrotask(() => fail(new Error('EADDRINUSE')))
      )
      return server
    })

    await expect(listener.sync()).rejects.toThrow('EADDRINUSE')
    expect(listener.isRunning()).toBe(false)
  })

  it('stop() closes it regardless', async () => {
    const { listener, server } = setup({ wanted: true })
    await listener.sync()
    listener.stop()

    expect(server.close).toHaveBeenCalled()
    expect(listener.isRunning()).toBe(false)
  })
})
