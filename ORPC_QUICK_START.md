# ORPC Quick Start Guide

## Server is Ready

The ORPC server has been successfully migrated and is running on **port 63129**.

## Using the ORPC Routes

### Setup Client (Frontend)

```typescript
import { createORPCClient } from '@orpc/client'

const client = createORPCClient<typeof router>({
  baseURL: 'http://localhost:63129'
})
```

### Example Usage

#### History

```typescript
// Get all chats
const chats = await client.history.getAll()
```

#### RAG

```typescript
// Upload files
await client.rag.upload([file1, file2])

// Search knowledge base
const results = await client.rag.retrieve({ question: 'What is...?' })

// List resources
const resources = await client.rag.list({ page: 1, pageSize: 10 })
```

#### Settings

```typescript
// Get settings
const settings = await client.setting.get()

// Update settings
await client.setting.update({
  providerConfig: { ... },
  providers: { ... }
})
```

#### Chat

```typescript
// Search messages
const results = await client.chat.search({ query: 'keyword' })

// Get messages
const messages = await client.chat.getMessages({ id: 'chat-id' })

// Delete chat
await client.chat.delete({ id: 'chat-id' })

// Update chat
await client.chat.update({ id: 'chat-id', title: 'New Title' })

// Get MCP tools
const { tools } = await client.chat.getMcpTools()
```

#### Audio

```typescript
// Text to speech
const audioBuffer = await client.audio.speech({ text: 'Hello world' })

// Speech to text
const transcription = await client.audio.transcriptions(audioFile)
```

#### Tools

```typescript
// Convert markdown to PDF
const pdfBuffer = await client.tools.markdownToPdf({ markdown: '# Title' })

// Ping Ollama
const status = await client.tools.pingOllama({ url: 'http://localhost:11434' })
```

#### Deep Research

```typescript
// Get research messages
const messages = await client.deepResearch.getMessages({ id: 'research-id' })

// Get research result
const result = await client.deepResearch.getResult({ id: 'research-id' })
```

#### File Upload

```typescript
// S3 uploader
const { url, key } = await client.s3Uploader.createUploadUrl({
  filename: 'file.jpg',
  contentType: 'image/jpeg'
})

// Custom uploader
const { url } = await client.customUploader.upload([file1, file2])
```

#### Database Import/Export

```typescript
// Export
const zipBuffer = await client.dbIo.exportData()

// Import
await client.dbIo.importData([
  { tableName: 'Chat', file: csvFile1 },
  { tableName: 'Message', file: csvFile2 }
])
```

### Error Handling

ORPC throws errors that you should catch:

```typescript
try {
  await client.chat.delete({ id: 'non-existent' })
} catch (error) {
  console.error('Failed:', error.message)
  // Error: Chat not found
}
```

### Type Safety

All inputs and outputs are type-safe:

```typescript
// TypeScript will error if you pass wrong types
await client.rag.list({
  page: 1,
  pageSize: 10
  // page and pageSize must be numbers > 0
})
```

## Testing the Migration

### Manual Testing

```bash
# Start the server
pnpm dev

# Test endpoint (using curl or Postman)
curl http://localhost:63129/history/getAll

# Or use ORPC client in test file
```

### Automated Testing

Create tests in `tests/orpc/`:

```typescript
import { expect, test } from 'vitest'
import { client } from './setup'

test('should get all chats', async () => {
  const chats = await client.history.getAll()
  expect(Array.isArray(chats)).toBe(true)
})

test('should handle errors', async () => {
  await expect(client.chat.getMessages({ id: 'invalid' })).rejects.toThrow(
    'Chat not found'
  )
})
```

## Migrating Frontend Code

### Before (Hono)

```typescript
const response = await fetch(`${BASE_URL}/api/history`)
if (!response.ok) throw new Error('Failed')
const data = await response.json()
```

### After (ORPC)

```typescript
const data = await client.history.getAll()
// Type-safe, auto error handling
```

### Before (Hono with FormData)

```typescript
const formData = new FormData()
formData.append('files', file)
const response = await fetch(`${BASE_URL}/api/rag`, {
  method: 'POST',
  body: formData
})
```

### After (ORPC)

```typescript
await client.rag.upload([file])
// Cleaner, type-safe
```

## Benefits of ORPC

1. **Type Safety**: Full TypeScript inference
2. **Less Boilerplate**: No manual fetch, JSON parsing
3. **Better Errors**: Structured error handling
4. **Validation**: Automatic with Zod schemas
5. **Documentation**: Self-documenting API

## Troubleshooting

### CORS Issues

Check that ORPC has CORS plugin enabled:

```typescript
// In app.ts
plugins: [new CORSPlugin()]
```

### Connection Refused

Verify server is running on port 63129:

```bash
lsof -i :63129
```

### Type Errors

Regenerate types:

```bash
pnpm typecheck
```

### Network Errors

Check base URL:

```typescript
// Should be http://localhost:63129, not 60223
```

## What's Not Migrated

These endpoints still use Hono (port 60223):

1. **POST /api/chat** - Streaming chat responses
2. **POST /api/deep-research** - Start research with streaming
3. **GET /api/deep-research/sse** - SSE subscription

For these, continue using the Hono client at port 60223.

## Next Steps

1. Test all ORPC routes
2. Update frontend to use ORPC client
3. Monitor for issues
4. Plan streaming migration strategy

See `ORPC_MIGRATION_COMPLETE.md` for full details.
