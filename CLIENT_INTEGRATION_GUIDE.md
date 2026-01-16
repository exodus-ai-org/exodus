# Client-Side Integration Guide for ORPC

## Setup ORPC Client

### 1. Install Dependencies

```bash
pnpm add @orpc/client
```

### 2. Create ORPC Client

Create `src/renderer/lib/orpc-client.ts`:

```typescript
import { createORPCClient } from '@orpc/client'
import type { router } from '../../../main/lib/server-orpc/routes'

export const orpcClient = createORPCClient<typeof router>({
  baseURL: 'http://localhost:63129'
})
```

## Migrating Existing Code

### Non-Streaming Endpoints

#### Before (Hono Fetch)

```typescript
// History
const response = await fetch(`${BASE_URL}/api/history`)
const chats = await response.json()

// RAG Upload
const formData = new FormData()
formData.append('files', file)
const response = await fetch(`${BASE_URL}/api/rag`, {
  method: 'POST',
  body: formData
})

// Settings
const response = await fetch(`${BASE_URL}/api/setting`)
const settings = await response.json()
```

#### After (ORPC)

```typescript
// History
const chats = await orpcClient.history.getAll()

// RAG Upload
await orpcClient.rag.upload([file])

// Settings
const settings = await orpcClient.setting.get()
```

### Streaming Chat Endpoint

This is the most important migration as it requires special handling with Vercel AI SDK.

#### Before (Hono Streaming)

```typescript
import { useChat } from '@ai-sdk/react'

const { messages, input, handleSubmit, setInput } = useChat({
  api: `${BASE_URL}/api/chat`,
  id: chatId,
  body: { advancedTools },
  onFinish: () => mutate('/api/history')
})
```

#### After (ORPC Streaming)

```typescript
import { useChat } from '@ai-sdk/react'
import { eventIteratorToUnproxiedDataStream } from '@orpc/client'
import { orpcClient } from '@/lib/orpc-client'

const { messages, input, handleSubmit, setInput } = useChat({
  id: chatId,
  body: { advancedTools },
  onFinish: () => mutate('/api/history'),
  transport: {
    async sendMessages(options) {
      // Convert ORPC event iterator to AI SDK data stream
      return eventIteratorToUnproxiedDataStream(
        await orpcClient.chat.stream(
          {
            id: chatId,
            messages: options.messages,
            advancedTools: options.body.advancedTools || []
          },
          { signal: options.abortSignal }
        )
      )
    }
  }
})
```

**Important:** Use `eventIteratorToUnproxiedDataStream` instead of `eventIteratorToStream` because AI SDK uses `structuredClone`, which doesn't work with proxied data.

## Complete Migration Examples

### Chat Component

```typescript
'use client'

import { useChat } from '@ai-sdk/react'
import { eventIteratorToUnproxiedDataStream } from '@orpc/client'
import { useAtomValue } from 'jotai'
import { useSWRConfig } from 'swr'
import { orpcClient } from '@/lib/orpc-client'
import { advancedToolsAtom } from '@/stores/chat'

export function ChatComponent({ chatId }: { chatId: string }) {
  const { mutate } = useSWRConfig()
  const advancedTools = useAtomValue(advancedToolsAtom)

  const { messages, input, handleSubmit, setInput, isLoading, stop } = useChat({
    id: chatId,
    onFinish: () => {
      mutate('/api/history')
    },
    transport: {
      async sendMessages(options) {
        return eventIteratorToUnproxiedDataStream(
          await orpcClient.chat.stream(
            {
              id: chatId,
              messages: options.messages,
              advancedTools
            },
            { signal: options.abortSignal }
          )
        )
      }
    }
  })

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id}>{msg.content}</div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
        {isLoading && <button onClick={stop}>Stop</button>}
      </form>
    </div>
  )
}
```

### Settings Component

```typescript
'use client'

import { useState, useEffect } from 'react'
import { orpcClient } from '@/lib/orpc-client'
import type { Setting } from '@shared/types/db'

export function SettingsComponent() {
  const [settings, setSettings] = useState<Setting | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const data = await orpcClient.setting.get()
      setSettings(data)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateSettings(updates: Partial<Setting>) {
    try {
      const updated = await orpcClient.setting.update(updates)
      setSettings(updated)
    } catch (error) {
      console.error('Failed to update settings:', error)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {/* Render settings form */}
      <button onClick={() => updateSettings({ /* changes */ })}>
        Save
      </button>
    </div>
  )
}
```

### RAG Upload Component

```typescript
'use client'

import { useState } from 'react'
import { orpcClient } from '@/lib/orpc-client'

export function RAGUploadComponent() {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(files: File[]) {
    setUploading(true)
    try {
      await orpcClient.rag.upload(files)
      alert('Files uploaded successfully')
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          handleUpload(files)
        }}
        disabled={uploading}
      />
    </div>
  )
}
```

### History List Component

```typescript
'use client'

import { useEffect, useState } from 'react'
import { orpcClient } from '@/lib/orpc-client'
import type { Chat } from '@shared/types/db'

export function HistoryList() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChats()
  }, [])

  async function loadChats() {
    try {
      const data = await orpcClient.history.getAll()
      setChats(data)
    } catch (error) {
      console.error('Failed to load chats:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteChat(id: string) {
    try {
      await orpcClient.chat.delete({ id })
      setChats(chats.filter((c) => c.id !== id))
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {chats.map((chat) => (
        <div key={chat.id}>
          <span>{chat.title}</span>
          <button onClick={() => deleteChat(chat.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
```

## Error Handling

ORPC throws errors that you should catch:

```typescript
try {
  await orpcClient.chat.delete({ id: 'non-existent' })
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message)
    // Show user-friendly error message
  }
}
```

## Type Safety

All ORPC calls are fully type-safe:

```typescript
// ✅ TypeScript will validate inputs
await orpcClient.rag.list({ page: 1, pageSize: 10 })

// ❌ TypeScript error: page must be > 0
await orpcClient.rag.list({ page: 0, pageSize: 10 })

// ✅ Return types are inferred
const chats = await orpcClient.history.getAll()
// chats: Chat[]
```

## SWR Integration (Recommended)

Combine ORPC with SWR for data fetching:

```typescript
import useSWR from 'swr'
import { orpcClient } from '@/lib/orpc-client'

export function useChats() {
  const { data, error, mutate } = useSWR('chats', () =>
    orpcClient.history.getAll()
  )

  return {
    chats: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  }
}

// Usage in component
function ChatsList() {
  const { chats, isLoading, refresh } = useChats()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {chats?.map((chat) => (
        <div key={chat.id}>{chat.title}</div>
      ))}
      <button onClick={refresh}>Refresh</button>
    </div>
  )
}
```

## Migration Checklist

- [ ] Install `@orpc/client`
- [ ] Create ORPC client singleton
- [ ] Migrate non-streaming endpoints (simple fetch replacement)
- [ ] Migrate chat streaming with `eventIteratorToUnproxiedDataStream`
- [ ] Update error handling (catch exceptions)
- [ ] Test all migrated features
- [ ] Remove old Hono fetch code
- [ ] Update types (should be automatic)

## Benefits

1. **Type Safety:** Full end-to-end type inference
2. **Less Boilerplate:** No manual `fetch`, JSON parsing, or error checking
3. **Better DX:** Autocomplete for all endpoints and parameters
4. **Validation:** Automatic input/output validation with Zod
5. **Streaming Support:** First-class support for AI SDK streaming

## Troubleshooting

### "Cannot find module '@orpc/client'"

Install the package:

```bash
pnpm add @orpc/client
```

### Type errors with `router`

Make sure the import path to router type is correct:

```typescript
import type { router } from '../../../main/lib/server-orpc/routes'
```

### Streaming not working

1. Make sure you're using `eventIteratorToUnproxiedDataStream` (not `eventIteratorToStream`)
2. Check that the signal is passed correctly
3. Verify the ORPC server is running on port 63129

### "Context isolation" errors

Make sure preload scripts expose ORPC client if needed, or use fetch-based transport in renderer.

## Next Steps

1. Start with simple endpoints (history, settings)
2. Then migrate RAG and tools
3. Finally migrate chat streaming
4. Test thoroughly
5. Remove Hono client code

See `ORPC_MIGRATION_COMPLETE.md` for full technical details.
