import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
  // main.js is a single bundled CJS file, where a bare `import.meta.url`
  // compiles to `{}.url` (undefined). Libraries whose ESM build calls
  // `fileURLToPath(import.meta.url)` at load time — node-cron's does, to
  // locate its background-task daemon — then crash the whole app on boot
  // ("The "path" argument must be of type string ... Received undefined").
  // electron-vite (universal-client) never hit this: it leaves main-process
  // deps external, so they load from node_modules as real modules. Point
  // it at the bundle's own file URL — what Node gives an ESM module.
  // (`process.getBuiltinModule` rather than `require`: the bundler renames
  // free `require` identifiers to avoid collisions with bundled code, which
  // turned an injected `require("node:url")` into a broken `require$1`.)
  define: {
    'import.meta.url':
      'process.getBuiltinModule("node:url").pathToFileURL(__filename).href'
  },
  build: {
    rollupOptions: {
      // PGlite resolves its own WASM/data assets relative to its package's
      // location inside node_modules (via import.meta.url internally).
      // Bundling it into the single main.js output breaks that resolution
      // ("TypeError: Invalid URL" at pglite.waitReady) since the bundled
      // file's location no longer matches. Keeping it external makes it a
      // real `require()`/`import()` from node_modules at runtime instead —
      // matching how electron-vite (used by the sibling universal-client
      // repo) externalizes main-process deps by default.
      //
      // Subpath imports like `@electric-sql/pglite/contrib/pg_trgm` are a
      // different specifier string than the bare package name, so they
      // need their own entry — verified by grepping the built output,
      // which had inlined pg_trgm.js (and an internal chunk it pulls in)
      // despite the bare package being externalized correctly. A
      // predicate function isn't usable here: Vite's Rolldown bundler
      // rejects a plain JS function for `external` in watch mode
      // ("Value is none of these types Array<T>, ThreadsafeFunction" on
      // BindingInputOptions.external).
      external: [
        '@electric-sql/pglite',
        '@electric-sql/pglite-pgmq',
        '@electric-sql/pglite-pgvector',
        '@electric-sql/pglite/contrib/pg_trgm',
        // DuckDB (Settings → Developer → Chat Audit) is a Node-API native
        // module that dlopens libduckdb from its own package directory —
        // same "must load from the real node_modules" rule as PGlite. It is
        // lazy-loaded via `import()` in lib/analytics/duckdb.ts, so keeping
        // it external also keeps it out of the boot path.
        '@duckdb/node-api',
        '@duckdb/node-bindings'
      ]
    }
  }
})
