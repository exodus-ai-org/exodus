# Deep Research ORPC Integration Guide

## Overview

The Deep Research feature has been migrated from Hono SSE to ORPC Event Iterator. This guide explains how to use the new ORPC-based API for starting and subscribing to deep research sessions.

## Architecture

### Key Differences: Hono vs ORPC

**Hono Approach (Old):**

- POST `/api/deep-research` - Start research (returns immediately)
- GET `/api/deep-research/sse?deepResearchId=xxx` - Subscribe to SSE stream
- Manual client registration with Map-based tracking
- Traditional SSE with `text/event-stream`

**ORPC Approach (New):**

- `deepResearch.start()` - Start research (returns immediately)
- `deepResearch.subscribe()` - Subscribe via async iterator
- EventPublisher-based event distribution
- Async generator functions for streaming
- Type-safe end-to-end

### Flow Diagram

```
Client calls deepResearch.start()
         ↓
Server validates config & starts background job
         ↓
Returns immediately: { success: true, deepResearchId }
         ↓
Client calls deepResearch.subscribe()
         ↓
Server yields events as they arrive
         ↓
Events: StartDeepResearch → EmitSearchQueries → EmitSearchResults
        → EmitLearnings → StartWritingFinalReport → CompleteDeepResearch
         ↓
Client receives real-time progress updates
```

## Server-Side Implementation

### Event Publisher

The server uses ORPC's `EventPublisher` for managing event streams:

```typescript
// In deep-research.ts
const deepResearchPublisher = new EventPublisher<{
  [deepResearchId: string]: {
    id: string
    deepResearchId: string
    message: JSONRPCNotification
    createdAt: Date
  }
}>()
```

Each deep research session has its own event channel (keyed by `deepResearchId`).

### Start Endpoint

```typescript
export const start = os
  .input(
    z.object({
      deepResearchId: z.string(),
      query: z.string()
    })
  )
  .handler(async ({ input }) => {
    // Validate settings
    const setting = await getSettings()

    // Start background job (non-blocking)
    runDeepResearch(deepResearchId, query, options).catch(handleError)

    // Return immediately
    return { success: true, deepResearchId }
  })
```

**Key Points:**

- Returns immediately (non-blocking)
- Research runs in background
- Progress published via EventPublisher

### Subscribe Endpoint

```typescript
export const subscribe = os
  .input(
    z.object({
      deepResearchId: z.string()
    })
  )
  .handler(async function* ({ input, signal }) {
    const iterator = deepResearchPublisher.subscribe(input.deepResearchId, {
      signal
    })

    for await (const message of iterator) {
      yield message
    }
  })
```

**Key Points:**

- Uses async generator (`async function*`)
- Automatically handles connection closure via `signal`
- Cleanup in `finally` block

### Progress Notifications

```typescript
async function notifyProgress(
  deepResearchId: string,
  data: ReportProgressPayload
) {
  const message = {
    id: uuidV4(),
    deepResearchId,
    message: {
      jsonrpc: '2.0',
      method: 'message/deep-research',
      params: { data }
    },
    createdAt: new Date()
  }

  // Save to database
  await saveDeepResearchMessage(message)

  // Publish to subscribers
  deepResearchPublisher.publish(deepResearchId, message)
}
```

## Client-Side Integration

### React Hook Example

```typescript
import { useEffect, useState } from 'react'
import { orpcClient } from '@/lib/orpc-client'
import type { DeepResearchProgress } from '@shared/types/deep-research'

export function useDeepResearch(deepResearchId: string) {
  const [messages, setMessages] = useState<any[]>([])
  const [status, setStatus] = useState<DeepResearchProgress | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const abortController = new AbortController()

    async function subscribe() {
      try {
        // Subscribe to event stream
        const stream = await orpcClient.deepResearch.subscribe(
          { deepResearchId },
          { signal: abortController.signal }
        )

        // Process each event
        for await (const message of stream) {
          const { data } = message.message.params

          setMessages((prev) => [...prev, message])
          setStatus(data.type)

          if (data.type === DeepResearchProgress.CompleteDeepResearch) {
            setIsComplete(true)
            break
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      }
    }

    subscribe()

    return () => {
      abortController.abort()
    }
  }, [deepResearchId])

  return { messages, status, isComplete, error }
}
```

### Starting a Research Session

```typescript
import { v4 as uuidV4 } from 'uuid'
import { orpcClient } from '@/lib/orpc-client'
import { parseAPIError } from '@shared/types/api-error'
import { ErrorCode } from '@shared/constants/error-codes'

async function startResearch(query: string) {
  const deepResearchId = uuidV4()

  try {
    // Start research
    const result = await orpcClient.deepResearch.start({
      deepResearchId,
      query
    })

    console.log('Research started:', result)
    return deepResearchId
  } catch (error) {
    const apiError = parseAPIError(error)

    if (apiError.is(ErrorCode.CONFIG_MISSING_REASONING_MODEL)) {
      toast.error('Please configure a reasoning model in settings')
      router.push('/settings')
    } else if (apiError.is(ErrorCode.CONFIG_INVALID)) {
      toast.error('Please configure Serper API Key in settings')
      router.push('/settings')
    } else {
      toast.error(apiError.getUserMessage())
    }

    throw error
  }
}
```

### Complete Component Example

```typescript
import { useState } from 'react'
import { v4 as uuidV4 } from 'uuid'
import { orpcClient } from '@/lib/orpc-client'
import { DeepResearchProgress } from '@shared/types/deep-research'
import { useDeepResearch } from '@/hooks/useDeepResearch'

export function DeepResearchComponent() {
  const [query, setQuery] = useState('')
  const [deepResearchId, setDeepResearchId] = useState<string | null>(null)

  // Start research
  const handleStart = async () => {
    const id = uuidV4()

    try {
      await orpcClient.deepResearch.start({
        deepResearchId: id,
        query
      })

      setDeepResearchId(id)
      toast.success('Research started')
    } catch (error) {
      console.error('Failed to start research:', error)
    }
  }

  // Subscribe to updates
  const { messages, status, isComplete } = useDeepResearch(deepResearchId!)

  return (
    <div>
      {!deepResearchId ? (
        <div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to research?"
          />
          <button onClick={handleStart}>Start Research</button>
        </div>
      ) : (
        <div>
          <h3>Research Progress</h3>

          {/* Status indicator */}
          <div>
            Status: {status !== null ? DeepResearchProgress[status] : 'Loading...'}
          </div>

          {/* Progress messages */}
          <div>
            {messages.map((msg) => {
              const { data } = msg.message.params

              return (
                <div key={msg.id}>
                  {renderProgressMessage(data)}
                </div>
              )
            })}
          </div>

          {/* Completion status */}
          {isComplete && (
            <div>
              <p>Research complete!</p>
              <button onClick={() => fetchFinalReport(deepResearchId)}>
                View Report
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper to render progress messages
function renderProgressMessage(data: any) {
  switch (data.type) {
    case DeepResearchProgress.StartDeepResearch:
      return <p>🔍 Starting deep research...</p>

    case DeepResearchProgress.EmitSearchQueries:
      return (
        <div>
          <p>🔎 Searching: {data.query}</p>
          <ul>
            {data.searchQueries.map((q, i) => (
              <li key={i}>{q.query}</li>
            ))}
          </ul>
        </div>
      )

    case DeepResearchProgress.EmitSearchResults:
      return (
        <div>
          <p>📄 Found {data.webSearchResults.length} results</p>
        </div>
      )

    case DeepResearchProgress.EmitLearnings:
      return (
        <div>
          <p>💡 Extracted {data.learnings.length} learnings</p>
          <ul>
            {data.learnings.map((l, i) => (
              <li key={i}>{l.learning}</li>
            ))}
          </ul>
        </div>
      )

    case DeepResearchProgress.StartWritingFinalReport:
      return <p>📝 Writing final report...</p>

    case DeepResearchProgress.CompleteDeepResearch:
      return <p>✅ Research complete!</p>

    default:
      return null
  }
}
```

## Event Stream Types

### Message Structure

Each event message has this structure:

```typescript
{
  id: string // Message ID
  deepResearchId: string // Research session ID
  message: {
    jsonrpc: '2.0'
    method: 'message/deep-research'
    params: {
      data: ReportProgressPayload
    }
  }
  createdAt: Date
}
```

### Progress Event Types

```typescript
enum DeepResearchProgress {
  StartDeepResearch, // Research started
  EmitSearchQueries, // Generated search queries
  EmitSearchResults, // Got search results
  EmitLearnings, // Extracted learnings
  StartWritingFinalReport, // Writing final report
  CompleteDeepResearch // Research complete
}
```

### Event Payloads

**StartDeepResearch:**

```typescript
{
  type: DeepResearchProgress.StartDeepResearch
}
```

**EmitSearchQueries:**

```typescript
{
  type: DeepResearchProgress.EmitSearchQueries
  query: string
  searchQueries: Array<{
    query: string
    researchGoal: string
  }>
  deeper?: boolean
}
```

**EmitSearchResults:**

```typescript
{
  type: DeepResearchProgress.EmitSearchResults
  webSearchResults: WebSearchResult[]
  query: string
}
```

**EmitLearnings:**

```typescript
{
  type: DeepResearchProgress.EmitLearnings
  learnings: Array<{
    learning: string
    citations: number[]
    image: string | null
  }>
}
```

**StartWritingFinalReport:**

```typescript
{
  type: DeepResearchProgress.StartWritingFinalReport
}
```

**CompleteDeepResearch:**

```typescript
{
  type: DeepResearchProgress.CompleteDeepResearch
  query: string
}
```

## Error Handling

### Server-Side Errors

The server uses standardized error codes:

- `SETTING_NOT_FOUND` - Failed to retrieve settings
- `CONFIG_MISSING_REASONING_MODEL` - No reasoning model configured
- `CONFIG_INVALID` - Missing Serper API Key
- `VALIDATION_INVALID_INPUT` - Empty query

### Client-Side Error Handling

```typescript
try {
  await orpcClient.deepResearch.start({ deepResearchId, query })
} catch (error) {
  const apiError = parseAPIError(error)

  if (apiError.is(ErrorCode.CONFIG_MISSING_REASONING_MODEL)) {
    toast.error('Configure reasoning model in settings')
    router.push('/settings')
  } else if (apiError.is(ErrorCode.CONFIG_INVALID)) {
    toast.error('Configure Serper API Key in settings')
    router.push('/settings')
  } else {
    toast.error(apiError.getUserMessage())
  }
}
```

### Stream Errors

```typescript
const { messages, status, error } = useDeepResearch(deepResearchId)

if (error) {
  return <div>Error: {error.message}</div>
}
```

## Comparison: Hono vs ORPC

| Feature                   | Hono                         | ORPC                                  |
| ------------------------- | ---------------------------- | ------------------------------------- |
| **Start endpoint**        | `POST /api/deep-research`    | `orpcClient.deepResearch.start()`     |
| **Subscribe endpoint**    | `GET /api/deep-research/sse` | `orpcClient.deepResearch.subscribe()` |
| **Client registration**   | Manual Map tracking          | EventPublisher automatic              |
| **Streaming protocol**    | SSE (text/event-stream)      | Async iterator                        |
| **Connection management** | Manual cleanup               | Automatic via signal                  |
| **Type safety**           | ❌ No                        | ✅ Full                               |
| **Error handling**        | Plain strings                | Error codes                           |
| **Client code**           | EventSource API              | for await...of loop                   |

## Migration Checklist

### Server-Side

- ✅ EventPublisher for event distribution
- ✅ `start` endpoint for starting research
- ✅ `subscribe` endpoint with async generator
- ✅ Background job execution
- ✅ Error handling with error codes
- ✅ Database persistence

### Client-Side

- [ ] Replace EventSource with `orpcClient.deepResearch.subscribe()`
- [ ] Use `for await...of` loop for consuming events
- [ ] Update error handling to use `parseAPIError()`
- [ ] Test connection abort/cleanup
- [ ] Update UI to show progress states

## Testing

### Manual Testing

1. **Start Research**

   ```typescript
   const id = 'test-123'
   await orpcClient.deepResearch.start({
     deepResearchId: id,
     query: 'Latest developments in AI'
   })
   ```

2. **Subscribe to Updates**

   ```typescript
   const stream = await orpcClient.deepResearch.subscribe({
     deepResearchId: 'test-123'
   })

   for await (const message of stream) {
     console.log('Progress:', message)
   }
   ```

3. **Check Database**

   ```typescript
   const messages = await orpcClient.deepResearch.getMessages({
     id: 'test-123'
   })

   const result = await orpcClient.deepResearch.getResult({
     id: 'test-123'
   })
   ```

### Automated Testing

```typescript
describe('Deep Research ORPC', () => {
  it('should start research and receive progress updates', async () => {
    const deepResearchId = uuidV4()

    // Start research
    const startResult = await orpcClient.deepResearch.start({
      deepResearchId,
      query: 'Test query'
    })

    expect(startResult.success).toBe(true)

    // Subscribe to updates
    const messages: any[] = []
    const stream = await orpcClient.deepResearch.subscribe({
      deepResearchId
    })

    for await (const message of stream) {
      messages.push(message)

      if (
        message.message.params.data.type ===
        DeepResearchProgress.CompleteDeepResearch
      ) {
        break
      }
    }

    // Verify progress events
    expect(messages.length).toBeGreaterThan(0)
    expect(messages[0].message.params.data.type).toBe(
      DeepResearchProgress.StartDeepResearch
    )
  })
})
```

## Benefits

✅ **Type-Safe** - Full TypeScript support end-to-end
✅ **Simpler Code** - Async generators vs manual SSE
✅ **Better Error Handling** - Standardized error codes
✅ **Auto Cleanup** - Signal-based connection management
✅ **Performance** - EventPublisher is lightweight
✅ **Maintainable** - Cleaner, more modern code

## Summary

The ORPC implementation of Deep Research provides:

- Type-safe API calls
- Modern async iterator streaming
- Automatic event distribution via EventPublisher
- Proper error handling with error codes
- Clean connection management
- Full compatibility with existing database schema

Migration is straightforward - replace EventSource with `for await...of` and enjoy better type safety and cleaner code!
