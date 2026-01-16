# Hono to ORPC Migration Summary

## Migration Status

### ✅ Completed Routes (with bug fixes)

1. **db-io** (`/api/db-io`)
   - ✅ `exportData` - Export database tables as ZIP
   - ✅ `importData` - Import CSV data into tables
   - Fixed: Schema validation improved

2. **history** (`/api/history`)
   - ✅ `getAll` - Get all chats
   - Fixed: Renamed from incorrect `findRelevant` to `getAll`

3. **rag** (`/api/rag`)
   - ✅ `retrieve` - Find relevant content by question
   - ✅ `upload` - Upload and embed files
   - ✅ `list` - Get paginated resources
   - Fixed: Renamed `findRelevant` → `retrieve`, `embeddingFiles` → `upload`, `embeddingList` → `list`
   - Fixed: Added proper error handling (throw instead of returning undefined)
   - Fixed: Added success response to upload

4. **s3-uploader** (`/api/s3-uploader`)
   - ✅ `createUploadUrl` - Generate presigned S3 upload URL
   - Fixed: Now registered in router

5. **setting** (`/api/setting`)
   - ✅ `get` - Get user settings
   - ✅ `update` - Update user settings

6. **audio** (`/api/audio`)
   - ✅ `speech` - Text-to-speech
   - ✅ `transcriptions` - Speech-to-text
   - Uses `withSetting` middleware

7. **tools** (`/api/tools`)
   - ✅ `markdownToPdf` - Convert markdown to PDF
   - ✅ `pingOllama` - Check Ollama availability

8. **workflow** (`/api/workflow`)
   - ✅ `execute` - Placeholder for workflow execution

9. **custom-uploader** (`/api/custom-uploader`)
   - ✅ `upload` - Proxy to custom upload endpoint
   - Uses `withSetting` middleware

### ⚠️ Pending Complex Routes

1. **chat** (`/api/chat`) - **COMPLEX STREAMING**
   - Requires streaming support for Vercel AI SDK
   - Multiple endpoints:
     - `POST /` - Stream chat completion
     - `GET /:id` - Load chat messages
     - `DELETE /:id` - Delete chat
     - `PUT /` - Update chat
     - `GET /search` - Full-text search
     - `GET /mcp` - List MCP tools
   - Challenge: ORPC streaming integration with Vercel AI data streams

2. **deep-research** (`/api/deep-research`) - **COMPLEX SSE**
   - Requires Server-Sent Events (SSE) support
   - Endpoints:
     - `POST /` - Start research and stream progress
     - `GET /subscribe/:id` - Subscribe to research updates
     - `GET /` - Get research list
     - `GET /:id` - Get research by ID
   - Challenge: ORPC SSE integration with client registration

## Bugs Fixed

### 1. Naming Conflicts

- **history.ts**: `findRelevant` → `getAll` (was conflicting with rag)
- **rag.ts**:
  - `findRelevant` → `retrieve`
  - `embeddingFiles` → `upload`
  - `embeddingList` → `list`

### 2. Error Handling

- **rag.ts**: Changed from returning `undefined` to throwing errors
- **rag.ts**: Added success response to upload function
- **custom-uploader.ts**: Throws error instead of returning bad response
- **tools.ts**: Proper error throwing for ping failures

### 3. Middleware Issues

- **withSetting.ts**: Changed `getSetting()` → `getSettings()` for consistency
- **withS3.ts**: Fixed context merging (was overwriting, now spreads `...context`)

### 4. Router Registration

- Added all migrated routes to main router
- Organized by feature area

## ORPC Router Structure

```typescript
export const router = {
  dbIo: { exportData, importData },
  history: { getAll },
  rag: { retrieve, upload, list },
  s3Uploader: { createUploadUrl },
  setting: { get, update },
  audio: { speech, transcriptions },
  tools: { markdownToPdf, pingOllama },
  workflow: { execute },
  customUploader: { upload }
  // TODO: chat, deepResearch
}
```

## Migration Patterns Used

### 1. Basic Handler

```typescript
export const methodName = os.handler(async () => {
  const result = await someQuery()
  return result
})
```

### 2. With Input Validation

```typescript
export const methodName = os
  .input(z.object({ param: z.string() }))
  .handler(async ({ input }) => {
    return await someOperation(input.param)
  })
```

### 3. With Middleware

```typescript
export const methodName = os
  .use(withSetting)
  .input(schema)
  .handler(async ({ input, context }) => {
    const { setting } = context
    return await operation(input, setting)
  })
```

### 4. Error Handling

```typescript
// Throw errors instead of returning error responses
if (!requiredValue) {
  throw new Error('Clear error message')
}
```

## Remaining Challenges

### Chat Route Streaming

The chat route uses Vercel AI SDK's `createDataStream` and `streamText` which returns a streaming response. ORPC needs to support:

- Streaming responses
- Custom headers (`X-Vercel-AI-Data-Stream: v1`)
- Text/plain charset encoding
- Pipe through TextEncoderStream

### Deep Research SSE

The deep research route implements Server-Sent Events with:

- Client registration system
- ReadableStream controllers
- Long-lived connections
- JSON-RPC notifications

ORPC needs SSE support or an alternative streaming mechanism.

## Next Steps

1. **Investigate ORPC Streaming**
   - Check if ORPC supports streaming responses
   - Look for SSE plugins or patterns
   - Consider WebSocket alternative

2. **Chat Route Strategy**
   - Option A: Keep chat in Hono, migrate everything else to ORPC
   - Option B: Implement streaming adapter for ORPC
   - Option C: Create hybrid server (Hono for streaming, ORPC for RPC)

3. **Deep Research Strategy**
   - Similar to chat route
   - May need separate SSE endpoint

4. **Testing**
   - Test each migrated route
   - Verify middleware chaining
   - Check error handling
   - Validate type safety

5. **Client Updates**
   - Update client-side code to call ORPC endpoints
   - Verify request/response formats match
   - Test file uploads (FormData handling)

## Files Changed

### Fixed/Updated

- `src/main/lib/server-orpc/routes/history.ts`
- `src/main/lib/server-orpc/routes/rag.ts`
- `src/main/lib/server-orpc/routes/db-io.ts`
- `src/main/lib/server-orpc/routes/s3-uploader.ts`
- `src/main/lib/server-orpc/middlewares/with-setting.ts`
- `src/main/lib/server-orpc/middlewares/with-s3.ts`
- `src/main/lib/server-orpc/routes/index.ts`

### Created

- `src/main/lib/server-orpc/routes/setting.ts`
- `src/main/lib/server-orpc/routes/audio.ts`
- `src/main/lib/server-orpc/routes/tools.ts`
- `src/main/lib/server-orpc/routes/workflow.ts`
- `src/main/lib/server-orpc/routes/custom-uploader.ts`

### Pending

- `src/main/lib/server-orpc/routes/chat.ts` (complex streaming)
- `src/main/lib/server-orpc/routes/deep-research.ts` (SSE)

## Architecture Notes

### Current Setup

- Hono server on port 60223 (handles all routes currently)
- ORPC server on port 63129 (handles migrated routes)
- Both servers running simultaneously

### Target Setup

- ORPC server as primary (port 63129)
- Possible hybrid: ORPC for RPC, Hono mini-server for streaming only
- Or: Full ORPC migration if streaming can be solved

## Testing Checklist

- [ ] dbIo export/import
- [ ] History list retrieval
- [ ] RAG upload, retrieve, list
- [ ] S3 upload URL generation
- [ ] Settings get/update
- [ ] Audio speech/transcriptions
- [ ] Tools PDF generation, Ollama ping
- [ ] Workflow execution
- [ ] Custom uploader proxy
- [ ] Chat streaming (pending)
- [ ] Deep research SSE (pending)

## Breaking Changes

### Function Name Changes

Clients calling ORPC methods need to update:

- `history.findRelevant()` → `history.getAll()`
- `rag.findRelevant()` → `rag.retrieve()`
- `rag.embeddingFiles()` → `rag.upload()`
- `rag.embeddingList()` → `rag.list()`

### Error Handling

ORPC throws errors instead of returning error response objects. Clients should handle exceptions.

### Context Requirements

Some routes now require specific context (setting, s3) which is provided by middlewares.
