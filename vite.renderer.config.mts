import { resolve } from 'path'

import { stripDataTestId } from '@exodus/shared/utils/strip-test-id'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const stripTestIds = process.env.STRIP_TEST_IDS === '1'

/**
 * Minimal Vite plugin that strips `data-testid` JSX props from OUR source
 * files only. Active when STRIP_TEST_IDS=1 (release builds). Dev and E2E
 * builds keep all markers intact.
 *
 * Note: @vitejs/plugin-react v6 uses OXC (not Babel), so babel.plugins is
 * ignored — this source-level transform hook is necessary.
 * No renderChunk hook: third-party libs carrying their own data-testid are
 * out of scope and left untouched. The strip itself lives in
 * `stripDataTestId` (unit-tested — a dynamic `data-testid={`…${x}…`}` broke
 * the old inline regex and only surfaced in a release build).
 */
function stripTestIdPlugin(): Plugin {
  return {
    name: 'strip-data-testid',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.[tj]sx$/.test(id) || /node_modules/.test(id)) return
      const stripped = stripDataTestId(code)
      if (stripped === code) return
      return { code: stripped, map: null }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('src/renderer')
    },
    // @electron-forge/plugin-vite forces `preserveSymlinks: true`, which keeps
    // the @exodus/shared workspace package at its node_modules path — so in dev
    // Vite treats it as a third-party dependency: its modules are served with
    // `?v=<hash>` URLs and `Cache-Control: max-age=31536000,immutable`, and the
    // file watcher ignores them. An edit to packages/shared then never reaches
    // the dev renderer, not even across restarts (the URL stays the same, so
    // the browser keeps its cached copy) — a changed SERVER_PORT kept being
    // fetched at the old value until a hard reload. It also gets pre-bundled,
    // which breaks the i18n loader's `import.meta.glob` (see below). Resolving
    // the symlink makes it ordinary source: revalidated on every request,
    // watched, hot-updated. Production builds (hash-named files loaded from
    // disk) never had the problem.
    preserveSymlinks: false
  },
  // No React Compiler — evaluated 2026-09-19 and dropped (its two packages are
  // uninstalled). The streaming hot path (messages.tsx, markdown.tsx) is
  // already memoized by hand, while 29 `form.watch()` reads across the
  // settings forms would go stale under it (react-hook-form, a known
  // incompatibility), for a build that takes 2.5x as long. The full notes are
  // in docs/migration-plan.md.
  plugins: [
    ...(stripTestIds ? [stripTestIdPlugin()] : []),
    react(),
    tailwindcss()
  ],
  optimizeDeps: {
    // Belt and braces alongside `preserveSymlinks: false` above. If the
    // package ever ends up under node_modules again (say a Forge upgrade
    // changes its defaults), Vite would pre-bundle it — and the pre-bundler
    // doesn't run Vite's own transforms: it silently turns the i18n loader's
    // `import.meta.glob('./locales/*/*.json')` into `Object.assign({})`, so no
    // catalog loads and the UI shows raw keys (`messageList.greetingTitle`).
    // Production builds and unit tests were unaffected, which is how that went
    // unnoticed at first.
    exclude: ['@exodus/shared']
  },
  build: {
    rollupOptions: {
      // Vite's root is the repo root (the @electron-forge/plugin-vite
      // default), so the sub-apps keep their `src/renderer/sub-apps/` prefix
      // in the output — window.ts (search bar, quick-chat) and
      // artifact-card.tsx (artifact sandbox iframe) load them from there.
      input: {
        main: resolve('index.html'),
        searchbar: resolve('src/renderer/sub-apps/searchbar/index.html'),
        quickChat: resolve('src/renderer/sub-apps/quick-chat/index.html'),
        artifacts: resolve('src/renderer/sub-apps/artifacts/index.html')
      }
    }
  }
})
