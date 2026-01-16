# Error Handling Guide

## Overview

Exodus uses a standardized error code system for reliable error handling across the application. All errors are categorized with specific error codes, HTTP status codes, and user-friendly messages.

## Architecture

### Server-Side Error System

The error system consists of:

1. **Error Codes** (`src/shared/constants/error-codes.ts`)
   - Enum of all error codes
   - Mapping to HTTP status codes
   - User-friendly messages

2. **Error Classes** (`src/shared/errors/`)
   - `AppError` - Base error class
   - `ConfigurationError` - Missing or invalid configuration
   - `NotFoundError` - Resource not found
   - `ValidationError` - Invalid input
   - `ServiceError` - External service failures
   - `DatabaseError` - Database operation failures
   - `FileError` - File operation failures
   - `AIError` - AI/Model errors
   - `InternalError` - Internal server errors

3. **Error Handler Middleware** (`src/main/lib/server-orpc/middlewares/error-handler.ts`)
   - Catches all errors
   - Converts to standardized format
   - Logs errors

### Client-Side Error System

The client-side system includes:

1. **API Error Types** (`src/shared/types/api-error.ts`)
   - `APIError` class for parsing server errors
   - Type guards and utilities
   - Error handling helpers

## Server-Side Usage

### Throwing Errors in Routes

Replace plain `throw new Error()` with specific error classes:

**Before:**

```typescript
if (!chat) {
  throw new Error('Chat not found')
}
```

**After:**

```typescript
import { ErrorCode } from '@shared/constants/error-codes'
import { NotFoundError } from '@shared/errors'

if (!chat) {
  throw new NotFoundError(ErrorCode.CHAT_NOT_FOUND, undefined, {
    chatId: input.id
  })
}
```

### Error Class Usage

#### Configuration Errors

```typescript
import { ErrorCode } from '@shared/constants/error-codes'
import { ConfigurationError } from '@shared/errors'

// Missing API key
if (!setting.providers?.openaiApiKey) {
  throw new ConfigurationError(ErrorCode.CONFIG_MISSING_OPENAI)
}

// Missing model
if (!embeddingModel) {
  throw new ConfigurationError(ErrorCode.CONFIG_MISSING_EMBEDDING_MODEL)
}
```

#### Not Found Errors

```typescript
import { ErrorCode } from '@shared/constants/error-codes'
import { NotFoundError } from '@shared/errors'

const chat = await getChatById({ id })
if (!chat) {
  throw new NotFoundError(ErrorCode.CHAT_NOT_FOUND, undefined, { chatId: id })
}
```

#### Validation Errors

```typescript
import { ErrorCode } from '@shared/constants/error-codes'
import { ValidationError } from '@shared/errors'

const userMessage = getMostRecentUserMessage(messages)
if (!userMessage) {
  throw new ValidationError(ErrorCode.VALIDATION_NO_USER_MESSAGE)
}
```

#### Service Errors

```typescript
import { ErrorCode } from '@shared/constants/error-codes'
import { ServiceError } from '@shared/errors'

try {
  await fetch(ollamaUrl)
} catch {
  throw new ServiceError(ErrorCode.SERVICE_OLLAMA_UNREACHABLE, undefined, {
    url: ollamaUrl
  })
}
```

#### File Errors

```typescript
import { ErrorCode } from '@shared/constants/error-codes'
import { FileError } from '@shared/errors'

try {
  const buffer = await generatePDF(content)
} catch (e) {
  throw new FileError(
    ErrorCode.PDF_GENERATION_FAILED,
    e instanceof Error ? e.message : 'Failed to generate PDF'
  )
}
```

### Error Constructor Parameters

All error classes accept:

```typescript
constructor(
  code: ErrorCode,           // Required: Error code from enum
  message?: string,           // Optional: Override default message
  metadata?: Record<string, any>, // Optional: Additional context
  isOperational?: boolean     // Optional: Is this an expected error? (default: true)
)
```

**Examples:**

```typescript
// Minimal - uses default message
throw new NotFoundError(ErrorCode.CHAT_NOT_FOUND)

// With custom message
throw new NotFoundError(
  ErrorCode.CHAT_NOT_FOUND,
  'The requested chat does not exist'
)

// With metadata for debugging
throw new NotFoundError(ErrorCode.CHAT_NOT_FOUND, undefined, {
  chatId: id,
  userId: user.id
})

// With all parameters
throw new ConfigurationError(
  ErrorCode.CONFIG_INVALID,
  'Database connection string is malformed',
  { connectionString: redactedString },
  true
)
```

## Client-Side Usage

### Parsing Errors

```typescript
import { parseAPIError, APIError, isAPIError } from '@shared/types/api-error'
import { ErrorCode } from '@shared/constants/error-codes'

try {
  await orpcClient.chat.stream(data)
} catch (error) {
  const apiError = parseAPIError(error)

  console.log(apiError.code) // ErrorCode enum
  console.log(apiError.message) // User-friendly message
  console.log(apiError.statusCode) // HTTP status code
  console.log(apiError.metadata) // Additional context
}
```

### Checking Error Types

```typescript
import { parseAPIError } from '@shared/types/api-error'
import { ErrorCode } from '@shared/constants/error-codes'

try {
  await orpcClient.rag.upload(files)
} catch (error) {
  const apiError = parseAPIError(error)

  // Check specific error code
  if (apiError.is(ErrorCode.CONFIG_MISSING_EMBEDDING_MODEL)) {
    alert('Please configure an embedding model in settings')
    router.push('/settings')
    return
  }

  // Check error category
  if (apiError.isConfigError()) {
    alert('Configuration error. Please check your settings.')
    router.push('/settings')
    return
  }

  if (apiError.isNotFoundError()) {
    alert('Resource not found')
    return
  }

  // Default handling
  alert(`Error: ${apiError.getUserMessage()}`)
}
```

### Error Handler Utility

```typescript
import { handleAPIError } from '@shared/types/api-error'
import { ErrorCode } from '@shared/constants/error-codes'

try {
  await orpcClient.chat.stream(data)
} catch (error) {
  handleAPIError(error, {
    [ErrorCode.CONFIG_MISSING_CHAT_MODEL]: (err) => {
      toast.error('Please configure a chat model')
      router.push('/settings')
    },
    [ErrorCode.CHAT_NOT_FOUND]: (err) => {
      toast.error('Chat not found')
      router.push('/history')
    }
  })
}
```

### React Hook Example

```typescript
import { useState } from 'react'
import { parseAPIError, APIError } from '@shared/types/api-error'
import { ErrorCode } from '@shared/constants/error-codes'

function useChatStream(chatId: string) {
  const [error, setError] = useState<APIError | null>(null)

  async function startStream(messages: Message[]) {
    try {
      setError(null)
      await orpcClient.chat.stream({ id: chatId, messages })
    } catch (e) {
      const apiError = parseAPIError(e)
      setError(apiError)

      // Handle specific errors
      if (apiError.is(ErrorCode.CONFIG_MISSING_CHAT_MODEL)) {
        // Redirect to settings
      }
    }
  }

  return { startStream, error }
}
```

## Error Code Categories

### Configuration Errors (400)

- `CONFIG_MISSING_OPENAI` - OpenAI API key not configured
- `CONFIG_MISSING_EMBEDDING_MODEL` - Embedding model not selected
- `CONFIG_MISSING_CHAT_MODEL` - Chat model not selected
- `CONFIG_MISSING_REASONING_MODEL` - Reasoning model not selected
- `CONFIG_MISSING_PROVIDER` - Provider not configured
- `CONFIG_INVALID` - Invalid configuration

### Not Found Errors (404)

- `CHAT_NOT_FOUND` - Chat session not found
- `MESSAGE_NOT_FOUND` - Message not found
- `RESOURCE_NOT_FOUND` - Generic resource not found
- `SETTING_NOT_FOUND` - Settings not found

### Validation Errors (400)

- `VALIDATION_FAILED` - Input validation failed
- `VALIDATION_NO_USER_MESSAGE` - No user message in request
- `VALIDATION_INVALID_INPUT` - Invalid input provided
- `VALIDATION_MISSING_FIELD` - Required field missing

### Service Errors (503)

- `SERVICE_OLLAMA_UNREACHABLE` - Ollama not reachable
- `SERVICE_OPENAI_FAILED` - OpenAI service failed
- `SERVICE_S3_FAILED` - S3 service failed
- `SERVICE_MCP_FAILED` - MCP service failed
- `SERVICE_UNAVAILABLE` - Generic service unavailable

### Database Errors (500)

- `DB_QUERY_FAILED` - Database query failed
- `DB_CONNECTION_FAILED` - Database connection failed
- `DB_SAVE_FAILED` - Failed to save to database
- `DB_DELETE_FAILED` - Failed to delete from database

### File Errors (500)

- `FILE_READ_FAILED` - Failed to read file
- `FILE_WRITE_FAILED` - Failed to write file
- `FILE_UPLOAD_FAILED` - Failed to upload file
- `FILE_PDF_GENERATION_FAILED` - Failed to generate PDF

### AI/Model Errors (500)

- `AI_STREAM_FAILED` - AI streaming failed
- `AI_GENERATION_FAILED` - AI generation failed
- `AI_EMBEDDING_FAILED` - Embedding generation failed

### Generic Errors (500)

- `INTERNAL_ERROR` - Internal server error
- `UNKNOWN_ERROR` - Unknown error

## Best Practices

### 1. Always Use Specific Error Codes

**Bad:**

```typescript
throw new Error('Something went wrong')
```

**Good:**

```typescript
throw new ConfigurationError(ErrorCode.CONFIG_MISSING_OPENAI)
```

### 2. Include Metadata for Debugging

**Bad:**

```typescript
throw new NotFoundError(ErrorCode.CHAT_NOT_FOUND)
```

**Good:**

```typescript
throw new NotFoundError(ErrorCode.CHAT_NOT_FOUND, undefined, {
  chatId: id,
  userId: context.userId,
  timestamp: new Date().toISOString()
})
```

### 3. Use Type-Safe Error Handling on Client

**Bad:**

```typescript
catch (error) {
  alert(error.message)
}
```

**Good:**

```typescript
catch (error) {
  const apiError = parseAPIError(error)

  if (apiError.isConfigError()) {
    router.push('/settings')
    return
  }

  toast.error(apiError.getUserMessage())
}
```

### 4. Handle Expected Errors Gracefully

```typescript
try {
  await orpcClient.chat.delete({ id })
} catch (error) {
  const apiError = parseAPIError(error)

  if (apiError.is(ErrorCode.CHAT_NOT_FOUND)) {
    // Already deleted, that's fine
    return
  }

  // Unexpected error, show to user
  toast.error(apiError.getUserMessage())
}
```

### 5. Log Errors with Context

```typescript
try {
  await processFile(file)
} catch (error) {
  const apiError = parseAPIError(error)

  console.error('File processing failed', {
    code: apiError.code,
    message: apiError.message,
    metadata: apiError.metadata,
    fileName: file.name,
    fileSize: file.size
  })

  throw apiError // Re-throw if needed
}
```

## Migration Guide

### Migrating Existing Error Handling

1. **Find all `throw new Error()` statements**

   ```bash
   grep -r "throw new Error" src/main/lib/server-orpc/routes/
   ```

2. **Replace with appropriate error class**

   ```typescript
   // Before
   throw new Error('Chat not found')

   // After
   import { ErrorCode } from '@shared/constants/error-codes'
   import { NotFoundError } from '@shared/errors'

   throw new NotFoundError(ErrorCode.CHAT_NOT_FOUND, undefined, { chatId: id })
   ```

3. **Update client-side error handling**

   ```typescript
   // Before
   catch (error) {
     console.error(error)
     alert('Something went wrong')
   }

   // After
   import { parseAPIError } from '@shared/types/api-error'

   catch (error) {
     const apiError = parseAPIError(error)
     console.error(`[${apiError.code}]`, apiError.message)

     if (apiError.isConfigError()) {
       router.push('/settings')
     } else {
       alert(apiError.getUserMessage())
     }
   }
   ```

## Testing Error Handling

### Server-Side Tests

```typescript
import { ErrorCode } from '@shared/constants/error-codes'
import { NotFoundError } from '@shared/errors'

describe('chat.getMessages', () => {
  it('should throw NotFoundError when chat not found', async () => {
    expect(() => handler({ id: 'non-existent' })).rejects.toThrow(NotFoundError)

    try {
      await handler({ id: 'non-existent' })
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError)
      expect(error.code).toBe(ErrorCode.CHAT_NOT_FOUND)
    }
  })
})
```

### Client-Side Tests

```typescript
import { parseAPIError } from '@shared/types/api-error'
import { ErrorCode } from '@shared/constants/error-codes'

describe('error handling', () => {
  it('should parse API errors correctly', () => {
    const error = new Error(
      JSON.stringify({
        error: {
          code: ErrorCode.CHAT_NOT_FOUND,
          message: 'Chat not found',
          statusCode: 404
        }
      })
    )

    const apiError = parseAPIError(error)

    expect(apiError.code).toBe(ErrorCode.CHAT_NOT_FOUND)
    expect(apiError.statusCode).toBe(404)
    expect(apiError.isNotFoundError()).toBe(true)
  })
})
```

## Troubleshooting

### Error Not Being Caught on Client

Make sure you're using `parseAPIError()`:

```typescript
try {
  await orpcClient.chat.stream(data)
} catch (error) {
  const apiError = parseAPIError(error) // ← Don't forget this
  console.log(apiError.code)
}
```

### Error Code Not Recognized

Verify the error code exists in `src/shared/constants/error-codes.ts`:

```typescript
export enum ErrorCode {
  CHAT_NOT_FOUND = 'CHAT_NOT_FOUND' // ← Must be defined here
  // ...
}
```

### Custom Error Message Not Showing

Pass message as second parameter:

```typescript
throw new NotFoundError(
  ErrorCode.CHAT_NOT_FOUND,
  'Custom message here', // ← Second parameter
  { chatId: id }
)
```

## Adding New Error Codes

1. **Add to error code enum** (`src/shared/constants/error-codes.ts`)

   ```typescript
   export enum ErrorCode {
     // ...
     MY_NEW_ERROR = 'MY_NEW_ERROR'
   }
   ```

2. **Add status code mapping**

   ```typescript
   export const ErrorCodeToStatus: Record<ErrorCode, number> = {
     // ...
     [ErrorCode.MY_NEW_ERROR]: 400
   }
   ```

3. **Add user-friendly message**

   ```typescript
   export const ErrorMessages: Record<ErrorCode, string> = {
     // ...
     [ErrorCode.MY_NEW_ERROR]: 'User-friendly error message'
   }
   ```

4. **Use in routes**

   ```typescript
   throw new ValidationError(ErrorCode.MY_NEW_ERROR, undefined, {
     context: 'data'
   })
   ```

5. **Handle on client**
   ```typescript
   if (apiError.is(ErrorCode.MY_NEW_ERROR)) {
     // Handle specifically
   }
   ```

## Summary

- ✅ Use specific error codes for all errors
- ✅ Include metadata for debugging
- ✅ Parse errors on client with `parseAPIError()`
- ✅ Handle errors based on error code or category
- ✅ Log errors with context
- ✅ Test error handling paths
- ✅ Document new error codes when adding them

The standardized error system provides:

- **Reliability**: Predictable error structure
- **Debuggability**: Rich error context and metadata
- **User Experience**: Friendly error messages
- **Type Safety**: Full TypeScript support
- **Maintainability**: Centralized error definitions
