# Security hardening

What protects Exodus today, what was fixed in the 2026-09-19 audit, and what is
still open. Read this before changing the HTTP server's middleware, the preload
bridge, window creation, or the artifact sandbox.

## Threat model

Exodus is local-first, but three things make it a target anyway:

1. **The API is unauthenticated and listens on every interface** (`*:60223`),
   on purpose — `exodus-ios` connects over the LAN. It returns the saved
   provider keys (`GET /api/v1/settings`) and can run shell commands
   (`POST /api/v1/chat` with the `terminal` tool).
2. **The renderer shows untrusted content**: model output (markdown links,
   generated artifact code) that a web page can steer through prompt injection
   via `webFetch` / `webSearch`, plus embedded third-party frames (CodeSandbox,
   TradingView, diagrams.net).
3. **The main process is fully privileged** (file tools, `terminal`, Computer
   Use), so anything that reaches the API or IPC inherits the user's account.

## In place

| Layer            | Protection                                                                                                                                                                                                                                                                                                           | Where                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Electron fuses   | `RunAsNode`, `NODE_OPTIONS`, `--inspect` off; cookie encryption, ASAR integrity and `OnlyLoadAppFromAsar` on                                                                                                                                                                                                         | `forge.config.ts`                     |
| Windows          | `sandbox: true`, `contextIsolation: true`, no `nodeIntegration`, no `<webview>`                                                                                                                                                                                                                                      | `window.ts`, `security.ts`            |
| Navigation       | A window can only reload itself; any other main-frame navigation is cancelled and, if it is a web link, handed to the OS                                                                                                                                                                                             | `security.ts` `hardenRenderers()`     |
| New windows      | Always denied; `http(s)` / `mailto` links open externally, every other scheme (`file:`, `smb:`, app schemes) is dropped                                                                                                                                                                                              | `security.ts` `isSafeExternalUrl()`   |
| Permissions      | Granted only to Exodus's own pages, never to an embedded frame (Electron's default grants everything)                                                                                                                                                                                                                | `security.ts` `isAppUrl()`            |
| Preload          | Exposes `ipcRenderer` wrappers, `process.platform` / `versions`, `api.os` / `locale` — not `process.env`                                                                                                                                                                                                             | `preload.ts`                          |
| HTTP origin gate | Accepts a request with no `Origin` (every native client, and the packaged renderer — a `file://` page in Electron sends none) or a loopback `http(s)` one (the dev renderer); rejects any other — websites, `null`, extensions — and loopback requests addressed by a public `Host` (DNS rebinding). 403 before CORS | `middlewares/origin-gate.ts`          |
| App lock         | `lockGate` answers 423 on `/api/*` while locked; unlock is IPC-only                                                                                                                                                                                                                                                  | `middlewares/lock-gate.ts`            |
| Single instance  | Electron's single-instance lock is taken in `db/db.ts` before PGlite is constructed; a second launch exits (the running app raises its window), or waits if the holder is quitting                                                                                                                                   | `single-instance.ts`, `db/db.ts`      |
| Artifact files   | `chatId` / `artifactId` may not resolve outside `~/.exodus/artifacts/<chatId>`                                                                                                                                                                                                                                       | `ai/artifacts.ts`, `ipc.ts`           |
| Job payloads     | Finished jobs are deleted, not archived; archives are truncated at launch (they held `apiKey` + whole conversations)                                                                                                                                                                                                 | `jobs/`                               |
| CSP              | `<meta>` policy per HTML entry; scripts `'self'` only in the main window                                                                                                                                                                                                                                             | `index.html`, `sub-apps/*/index.html` |

## Open — needs a decision or a verified change

Ordered by severity. None of these could be verified without running the
packaged app, so they were written up rather than changed blind.

### 1. The artifact sandbox is not isolated from the app (high)

`artifact-card.tsx` embeds the sandbox with
`sandbox="allow-scripts allow-same-origin"`, and the sandbox page is served from
the **same origin** as the main window (`http://localhost:5173` in dev,
`file://` when packaged — Electron treats `file://` frames as same-origin).
That combination is the one the HTML spec warns about: the framed script can
reach `window.parent`. Generated artifact code (`new Function` in
`sandbox.tsx`) can therefore call `window.parent.electron.ipcRenderer`, read the
parent DOM, and `window.parent.fetch('http://localhost:60223/api/v1/settings')`
under the parent's CSP — then leak the keys through `img-src *`. The comment in
`sandbox.tsx` ("separate origin") describes the intent, not the current state.

Fix: serve the sandbox from its own origin. Register a privileged custom scheme
(`protocol.registerSchemesAsPrivileged` + `protocol.handle`, e.g.
`exodus-artifact://sandbox/…`) that serves the built `sub-apps/artifacts`
files, point the iframe at it in packaged builds (and at a second Vite origin
in dev), add the scheme to the main window's `frame-src`, drop
`connect-src http://localhost:*` from the sandbox CSP, and have the origin gate
reject that scheme's `Origin`. Verify with the artifact e2e spec on a packaged
build — module scripts, fonts and the `postMessage` handshake all depend on the
origin.

### 2. LAN clients are not authenticated (high on untrusted networks)

Anyone on the same network can read the provider keys and drive the `terminal`
tool. The origin gate only stops browsers acting for someone else. Fix: a
pairing token — main generates a secret, the renderer gets it over IPC,
`exodus-ios` by scanning a QR code in Settings; every `/api/*` request carries
it. Until then: bind to loopback unless "Allow LAN clients" is switched on.
Both change the `exodus-ios` contract.

### 3. Smaller items

- `img-src *` in every CSP is the exfiltration channel for #1; narrowing it
  breaks remote images in chat unless they are proxied through main.
- `terminal`, `writeFile` and `editFile` run without per-call confirmation;
  the tool toggle in the composer is the only gate.
- The single-instance lock is keyed on Electron's `userData`, so it covers dev
  vs packaged Exodus but not universal-client, which shares `~/.exodus` from a
  `userData` of its own.
- Signing / notarization is not wired (`osxSign`), so ASAR integrity is only as
  strong as the unsigned bundle.
- `GET /api/v1/tools/ping-ollama?url=` fetches any URL from main (reachability
  oracle for internal hosts).
