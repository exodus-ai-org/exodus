/**
 * Stable, semantic test ids ("checkpoints") for key interactive elements.
 *
 * Single source of truth: components apply these via `data-testid={TEST_IDS.…}`
 * and Playwright tests reference the same constants via `getByTestId(...)`.
 * The value mirrors the object path (camelCase → kebab-case), e.g.
 * `TEST_IDS.lock.pinInput` → `'lock.pin-input'`. Ids are a durable contract:
 * once added, do not rename or regenerate them. The linkage test
 * (`test-ids.linkage.test.ts`) enforces that every id is applied in source and
 * referenced by a test.
 */
export const TEST_IDS = {
  lock: {
    pinInput: 'lock.pin-input',
    touchIdButton: 'lock.touch-id-button',
    enablePinInput: 'lock.enable-pin-input',
    confirmPinInput: 'lock.confirm-pin-input',
    idleSelect: 'lock.idle-select',
    removeButton: 'lock.remove-button',
    removePinInput: 'lock.remove-pin-input'
  },
  gallery: {
    thumbnail: 'gallery.thumbnail',
    lightboxClose: 'gallery.lightbox-close',
    lightboxPrev: 'gallery.lightbox-prev',
    lightboxNext: 'gallery.lightbox-next',
    lightboxDot: 'gallery.lightbox-dot'
  },
  video: {
    card: 'video.card'
  },
  schedule: {
    tab: 'schedule.tab',
    createButton: 'schedule.create-button',
    taskCard: 'schedule.task-card',
    cancelButton: 'schedule.cancel-button'
  },
  skillsMarket: {
    searchInput: 'skills-market.search-input',
    viewToggle: 'skills-market.view-toggle',
    discoverTab: 'skills-market.discover-tab',
    installedTab: 'skills-market.installed-tab',
    row: 'skills-market.row',
    expandGroupButton: 'skills-market.expand-group-button',
    curatedOwnerButton: 'skills-market.curated-owner-button',
    loadMoreButton: 'skills-market.load-more-button',
    backButton: 'skills-market.back-button',
    installButton: 'skills-market.install-button',
    uninstallButton: 'skills-market.uninstall-button',
    confirmUninstallButton: 'skills-market.confirm-uninstall-button',
    activeSwitch: 'skills-market.active-switch',
    auditPanel: 'skills-market.audit-panel',
    cliCommand: 'skills-market.cli-command',
    copyCommandButton: 'skills-market.copy-command-button'
  },
  chatAudit: {
    buildButton: 'chat-audit.build-button',
    openFolderButton: 'chat-audit.open-folder-button',
    presetButton: 'chat-audit.preset-button',
    sqlInput: 'chat-audit.sql-input',
    runButton: 'chat-audit.run-button',
    resultsTable: 'chat-audit.results-table',
    downloadCsvButton: 'chat-audit.download-csv-button'
  },
  devices: {
    pairButton: 'devices.pair-button',
    qrCode: 'devices.qr-code',
    copyLinkButton: 'devices.copy-link-button',
    cancelPairingButton: 'devices.cancel-pairing-button',
    deviceRow: 'devices.device-row',
    revokeButton: 'devices.revoke-button',
    resetButton: 'devices.reset-button'
  },
  fullTextSearch: {
    testConnectionButton: 'full-text-search.test-connection-button',
    reindexButton: 'full-text-search.reindex-button'
  },
  knowledgeBase: {
    testConnectionButton: 'knowledge-base.test-connection-button',
    reindexButton: 'knowledge-base.reindex-button',
    addButton: 'knowledge-base.add-button',
    docDialog: 'knowledge-base.doc-dialog',
    docTitleInput: 'knowledge-base.doc-title-input',
    docContentInput: 'knowledge-base.doc-content-input',
    docSaveButton: 'knowledge-base.doc-save-button'
  },
  discover: {
    enableToggle: 'discover.enable-toggle',
    section: 'discover.section'
  },
  computerUse: {
    enableToggle: 'computer-use.enable-toggle',
    allowlistInput: 'computer-use.allowlist-input',
    stopButton: 'computer-use.stop-button',
    continueButton: 'computer-use.continue-button'
  },
  logger: {
    scopeSelect: 'logger.scope-select',
    traceBadge: 'logger.trace-badge',
    traceFilterChip: 'logger.trace-filter-chip'
  },
  chatToc: {
    rail: 'chat-toc.rail',
    entry: 'chat-toc.entry'
  },
  settings: {
    themeMode: 'settings.theme-mode',
    colorTone: 'settings.color-tone',
    languageSelect: 'settings.language-select'
  },
  chatLayout: {
    workspaceSwitcher: 'chat-layout.workspace-switcher',
    searchButton: 'chat-layout.search-button',
    newChat: 'chat-layout.new-chat',
    account: 'chat-layout.account',
    accountSettings: 'chat-layout.account-settings'
  },
  philharmonic: {
    newGroup: 'philharmonic.new-group',
    membersToggle: 'philharmonic.members-toggle'
  },
  providerModels: {
    refreshButton: 'provider-models.refresh-button',
    modelSelect: 'provider-models.model-select',
    /** The refresh refused: a saved key cannot go to an unsaved base URL. */
    reenterError: 'provider-models.reenter-error'
  },
  /**
   * Stored secrets in Settings. Every key input carries `data-field="<settings
   * path>"` and, while it shows a saved key's mask, `data-masked="true"`.
   */
  secrets: {
    keyInput: 'secrets.key-input',
    /** Under a key input whose saved key was cleared or can't be read. */
    reenterPrompt: 'secrets.reenter-prompt',
    /** Under a base-URL field whose key is saved: changing it clears the key. */
    destinationHint: 'secrets.destination-hint',
    /** Settings → General: the keychain is unavailable. */
    encryptionNotice: 'secrets.encryption-notice',
    /** Settings → General: the keys that need entering again. */
    reentryNotice: 'secrets.reentry-notice'
  },
  /** Settings → MCP Servers, the server form. */
  mcpServers: {
    /** The stdio server's environment variables (JSON). */
    envInput: 'mcp-servers.env-input',
    /** A field the server refused (`data-field`: url, args, env, headers…). */
    fieldError: 'mcp-servers.field-error'
  },
  chat: {
    /** One per assistant message (= one per run). */
    messageAction: 'chat.message-action',
    /** At the foot of a run that changed memory (the `update_memory` tool). */
    memoryStrip: {
      root: 'chat.memory-strip.root',
      toggle: 'chat.memory-strip.toggle',
      undo: 'chat.memory-strip.undo'
    },
    /** At the foot of a run that used memories: the line and its popover. */
    usedMemories: {
      trigger: 'chat.used-memories.trigger',
      popover: 'chat.used-memories.popover',
      /** One per entry in the popover. */
      wrong: 'chat.used-memories.wrong',
      openSettings: 'chat.used-memories.open-settings'
    }
  },
  composer: {
    reasoningEffortItem: 'composer.reasoning-effort-item',
    reasoningEffortLevel: 'composer.reasoning-effort-level',
    textarea: 'composer.textarea'
  },
  findInPage: {
    input: 'find-in-page.input',
    previousButton: 'find-in-page.previous-button',
    nextButton: 'find-in-page.next-button',
    closeButton: 'find-in-page.close-button'
  },
  weatherCard: {
    /** The Details / Less toggle at the card's foot. */
    details: 'weather-card.details',
    /** The readings grid, visible only once the card is open. */
    readings: 'weather-card.readings'
  },
  /** The `image_generation` tool's card in a chat. */
  imageGeneration: {
    /** One frame (its `data-state`: generating / complete / error). */
    card: 'image-generation.card'
  },
  /** Settings → Memory. */
  memorySettings: {
    /** Retry on the stored-memories list after its read failed. */
    retry: 'memory-settings.retry'
  },
  /** Settings → Built-in Tools. Each carries `data-tool="<wire name>"`. */
  tools: {
    /** A tool's on/off switch. */
    toggle: 'tools.toggle',
    /** The Configure disclosure of a tool that has a panel. */
    configure: 'tools.configure',
    /** The panel itself (its `data-open` says whether it is open). */
    panel: 'tools.panel'
  }
} as const

export interface FlatTestId {
  /** Source token, e.g. "TEST_IDS.lock.pinInput". */
  accessor: string
  /** Attribute value, e.g. "lock.pin-input". */
  value: string
}

/** Flatten the nested registry into accessor/value pairs for tooling. */
export function flattenTestIds(
  node: Record<string, unknown> = TEST_IDS,
  prefix = 'TEST_IDS'
): FlatTestId[] {
  const out: FlatTestId[] = []
  for (const [key, val] of Object.entries(node)) {
    const accessor = `${prefix}.${key}`
    if (typeof val === 'string') {
      out.push({ accessor, value: val })
    } else if (val && typeof val === 'object') {
      out.push(...flattenTestIds(val as Record<string, unknown>, accessor))
    }
  }
  return out
}
