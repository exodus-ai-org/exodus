# Exodus AI

## Project Overview

Exodus is a high-performance, cross-platform AI chat application for desktop that is compatible with a variety of model providers. It's built with Electron, React, TypeScript, and Vite.

The application features a main process (`src/main`), a preload script (`src/preload`), and a renderer process (`src/renderer`). The renderer process is further divided into multiple sub-apps, including a main chat interface, a search bar, and a quick chat window.

Exodus supports a wide range of LLM providers, including OpenAI, Azure OpenAI, Google Gemini, Xai Grok, Anthropic Claude, and Ollama. It also includes several core features, such as:

- **Daily Chat:** A seamless chat experience with an intuitive and user-friendly interface.
- **Deep Research:** A system that analyzes the user's query and generates follow-up questions to refine the research intent.
- **Built-in Calling Tools:** Including web search, weather, Google Maps routing, and image generation.
- **Audio and Speech:** Text-to-speech and speech-to-text services.

## Building and Running

### Prerequisites

- [Node.js](https://nodejs.org/) (>=20.18.0)
- [pnpm](https://pnpm.io/)

### Available Scripts

- **Development:** To start the development server, run `pnpm dev`.
- **Building:**
  - To build the application for macOS, run `pnpm build:mac`.
  - To build the application for Linux, run `pnpm build:linux`.
  - To build the application for Windows, run `pnpm build:win`.
- **Linting:** To lint the codebase, run `pnpm lint`.
- **Type-checking:** To type-check the codebase, run `pnpm typecheck`.

## Development Conventions

### Code Style

The project uses [Prettier](https://prettier.io/) for code formatting and [ESLint](https://eslint.org/) for linting. You can format the code by running `pnpm format` and lint the code by running `pnpm lint`.

### Git Hooks

The project uses [husky](https://typicode.github.io/husky/) to enforce code quality with a pre-commit hook that runs `lint-staged`. This ensures that all committed code is properly formatted and linted.

### Type Safety

The project is written in [TypeScript](https://www.typescriptlang.org/) and uses it to ensure type safety. You can type-check the codebase by running `pnpm typecheck`.
