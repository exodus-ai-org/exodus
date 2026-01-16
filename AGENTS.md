# Repository Guidelines

## Project Structure & Module Organization

- App source lives in `src`: `main/` (Electron main process, window lifecycle, updates), `preload/` (IPC bridges and safe globals), `renderer/` (React UI), and `shared/` (types and helpers shared across processes).
- Build outputs land in `dist/` (vite bundles) and `out/` (electron-builder artifacts). Static assets and icons sit in `resources/`; marketing shots in `screenshots/`.
- Automation and utilities are under `scripts/`; Electron/Vite/TypeScript configs are at the repo root.

## Build, Test, and Development Commands

- `pnpm install` — install dependencies (Node ≥ 22.13 required).
- `pnpm dev` — run the Electron app with hot reload.
- `pnpm start` — preview a production build.
- `pnpm build` — typecheck then bundle for all targets; use `pnpm build:mac|linux|win|unpack` for platform-specific packages.
- `pnpm typecheck` — run both `tsconfig.node.json` and `tsconfig.web.json` without emitting.
- `pnpm lint` — ESLint with React/Hooks rules; `pnpm format` — Prettier with import/tailwind plugins.
- `pnpm db:generate` — regenerate Drizzle client code when schema changes.

## Coding Style & Naming Conventions

- TypeScript-first; prefer React function components. Components and hooks use `PascalCase`/`camelCase`; files generally follow the component or feature name (e.g., `ChatPanel.tsx`, `useAgentStore.ts`).
- Prettier enforces single quotes, no semicolons, 80-char width, and ordered imports/tailwind classes; run `pnpm format` before pushing.
- ESLint extends Electron Toolkit TS/React configs; hook rules and fast-refresh checks are enabled. Avoid explicit return types only where readability allows.

## Testing Guidelines

- No formal test suite yet; gate changes with `pnpm typecheck`, `pnpm lint`, and a manual smoke run via `pnpm dev` on the relevant flow.
- When adding tests, colocate as `*.test.ts`/`*.test.tsx` near the code and cover IPC boundaries and renderer hooks.

## Commit & Pull Request Guidelines

- Use Conventional Commits (semantic-release enabled on `master`), e.g., `feat: add multi-provider switcher` or `fix: handle preload init error`.
- PRs should describe scope, link issues, and include screenshots/GIFs for UI changes. Note required env/config flags when applicable.
- Ensure lint/format hooks pass (`npx lint-staged` runs via Husky). Update docs and changelog entries when behavior changes.
