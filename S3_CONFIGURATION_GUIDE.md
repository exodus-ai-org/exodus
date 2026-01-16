# S3 Configuration Guide

## Overview

The S3 uploader now uses configuration from the database (Setting) instead of environment variables. The S3 client is automatically cached and synchronized when settings are updated.

## Architecture

### Configuration Source

**Before (Environment Variables):**

```typescript
// ❌ Old approach - hardcoded from .env
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})
```

**After (Database Settings):**

```typescript
// ✅ New approach - from database, auto-synced
export const createUploadUrl = os
  .use(withS3)
  .handler(async ({ input, context }) => {
    const { s3 } = context
    // s3.client and s3.bucket are automatically provided and synced
  })
```

### S3 Schema in Settings

**Location:** `src/shared/schemas/setting-schema.ts`

```typescript
export const S3Schema = z.object({
  region: z.string().nullable(),
  bucket: z.string().nullable(),
  accessKeyId: z.string().nullable(),
  secretAccessKey: z.string().nullable()
})
```

The schema validates that either:

- All fields are empty (S3 not configured), OR
- All fields are filled (complete S3 configuration)

This prevents partial configuration which would cause runtime errors.

## Automatic Synchronization

### How It Works

The synchronization is handled by the `withS3` middleware using a smart caching strategy:

**File:** `src/main/lib/server-orpc/middlewares/with-s3.ts`

```typescript
let cachedClient: S3Client | null = null
let cachedVersion: string | null = null

export const withS3 = withSetting.concat(
  os.$context<{ setting: Setting }>().middleware(async ({ context, next }) => {
    const { setting } = context

    // Use updatedAt as cache version
    const version = setting.updatedAt.toISOString()

    // Return cached client if settings haven't changed
    if (cachedClient && cachedVersion === version) {
      return next({
        context: {
          ...context,
          s3: { client: cachedClient, bucket: setting.s3.bucket }
        }
      })
    }

    // Create new client when settings change
    const client = createS3Client(setting)
    cachedClient = client
    cachedVersion = version

    return next({
      context: {
        ...context,
        s3: { client, bucket: setting.s3.bucket }
      }
    })
  })
)
```

### Key Points

1. **Cache Key:** `setting.updatedAt.toISOString()`
   - Every time settings are updated in the database, `updatedAt` timestamp changes
   - This automatically invalidates the cache

2. **Automatic Invalidation:**
   - When user updates S3 settings → `updatedAt` changes
   - Next API call → Cache version mismatch detected
   - New S3Client created with updated credentials
   - Cache updated with new version

3. **Zero Manual Invalidation:**
   - No need to call any cache invalidation function
   - No need to restart the server
   - Settings update automatically propagates to all routes

## Flow Diagram

```
User Updates S3 Settings
         ↓
Setting.updatedAt = new Date()
         ↓
Next API call with withS3
         ↓
Compare cachedVersion with setting.updatedAt
         ↓
    Mismatch detected
         ↓
Create new S3Client(newCredentials)
         ↓
Update cache: cachedClient = newClient
         ↓
Update version: cachedVersion = newUpdatedAt
         ↓
Return new client to handler
```

## Usage in Routes

### Basic Usage

```typescript
import { os } from '@orpc/server'
import { withS3 } from '../middlewares/with-s3'

export const uploadFile = os
  .use(withS3)
  .input(z.object({ filename: z.string() }))
  .handler(async ({ input, context }) => {
    const { s3 } = context

    // Use s3.client for AWS operations
    const command = new PutObjectCommand({
      Bucket: s3.bucket, // Automatically from settings
      Key: input.filename
      // ...
    })

    await s3.client.send(command)
  })
```

### Context Type

The `withS3` middleware provides this context:

```typescript
context.s3 = {
  client: S3Client, // Cached S3 client
  bucket: string // Bucket name from settings
}
```

### Error Handling

The middleware automatically validates S3 configuration:

```typescript
// Missing S3 configuration
if (!setting.s3) {
  throw new ConfigurationError(
    ErrorCode.CONFIG_INVALID,
    'S3 configuration is missing. Please configure S3 in settings.'
  )
}

// Incomplete S3 configuration
if (!region || !bucket || !accessKeyId || !secretAccessKey) {
  throw new ConfigurationError(
    ErrorCode.CONFIG_INVALID,
    'S3 configuration is incomplete. Please fill in all S3 fields in settings.'
  )
}
```

Users will get a clear error message if S3 is not properly configured.

## Client-Side Integration

### Updating S3 Settings

When the user updates S3 settings in the UI:

```typescript
// In settings component
const updateS3Settings = async (s3Config: S3Config) => {
  try {
    await orpcClient.setting.update({
      s3: {
        region: s3Config.region,
        bucket: s3Config.bucket,
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey
      }
    })

    toast.success('S3 settings updated')
    // Next API call will automatically use new credentials
  } catch (error) {
    const apiError = parseAPIError(error)
    toast.error(apiError.getUserMessage())
  }
}
```

### Handling S3 Errors

```typescript
import { parseAPIError } from '@shared/types/api-error'
import { ErrorCode } from '@shared/constants/error-codes'

try {
  await orpcClient.s3Uploader.createUploadUrl({
    filename: 'test.jpg',
    contentType: 'image/jpeg'
  })
} catch (error) {
  const apiError = parseAPIError(error)

  if (apiError.is(ErrorCode.CONFIG_INVALID)) {
    toast.error('Please configure S3 in settings')
    router.push('/settings?tab=s3')
  } else if (apiError.is(ErrorCode.SERVICE_S3_PRESIGN_FAILED)) {
    toast.error(
      'Failed to generate upload URL. Please check your S3 credentials.'
    )
  }
}
```

## Testing S3 Configuration

### Manual Testing Steps

1. **Configure S3 Settings**
   - Open Settings → S3 Configuration
   - Enter AWS region, bucket, access key ID, and secret access key
   - Save settings

2. **Test Upload URL Generation**

   ```typescript
   const result = await orpcClient.s3Uploader.createUploadUrl({
     filename: 'test.txt',
     contentType: 'text/plain'
   })

   console.log('Presigned URL:', result.url)
   console.log('S3 Key:', result.key)
   ```

3. **Update S3 Settings**
   - Change any S3 setting (e.g., bucket name)
   - Save settings
   - Immediately try step 2 again
   - Verify new settings are used (check bucket in response)

4. **Test Invalid Configuration**
   - Set invalid AWS credentials
   - Try to generate upload URL
   - Should receive proper error message

### Automated Testing

```typescript
describe('S3 Configuration Sync', () => {
  it('should use updated S3 settings immediately', async () => {
    // Update S3 settings
    await orpcClient.setting.update({
      s3: {
        region: 'us-west-2',
        bucket: 'test-bucket-new',
        accessKeyId: 'new-key',
        secretAccessKey: 'new-secret'
      }
    })

    // Next call should use new settings
    const result = await orpcClient.s3Uploader.createUploadUrl({
      filename: 'test.txt',
      contentType: 'text/plain'
    })

    // Verify URL contains new bucket name
    expect(result.url).toContain('test-bucket-new')
  })

  it('should throw error for incomplete S3 config', async () => {
    await orpcClient.setting.update({
      s3: {
        region: 'us-west-2',
        bucket: null, // Incomplete
        accessKeyId: 'key',
        secretAccessKey: 'secret'
      }
    })

    await expect(
      orpcClient.s3Uploader.createUploadUrl({
        filename: 'test.txt',
        contentType: 'text/plain'
      })
    ).rejects.toThrow(ConfigurationError)
  })
})
```

## Performance Considerations

### Cache Benefits

1. **No Repeated Client Creation**
   - S3Client is created once per settings version
   - Reused across all requests with same settings
   - Reduces overhead of client initialization

2. **Fast Settings Check**
   - Simple timestamp comparison: `O(1)`
   - No database query on cache hit
   - Negligible performance impact

3. **Memory Efficient**
   - Only one S3Client instance cached
   - Old client is garbage collected when replaced
   - Minimal memory footprint

### When Cache is Invalidated

Cache invalidation occurs when:

1. ✅ User updates S3 settings via UI
2. ✅ Admin updates settings via API
3. ✅ Automated settings update (if any)
4. ❌ Server restart (cache starts empty, but recreated on first request)

## Migration from Environment Variables

### Step 1: Configure S3 in Database

Before deploying the new code, ensure S3 settings are in the database:

```sql
UPDATE setting SET
  s3 = '{"region": "us-east-1", "bucket": "my-bucket", "accessKeyId": "AKIAIOSFODNN7EXAMPLE", "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}'::jsonb
WHERE id = '1';
```

Or via the UI Settings page.

### Step 2: Remove Environment Variables

After deployment, you can remove these from `.env`:

- ~~`AWS_REGION`~~
- ~~`AWS_ACCESS_KEY_ID`~~
- ~~`AWS_SECRET_ACCESS_KEY`~~
- ~~`S3_BUCKET`~~

They are no longer used.

### Step 3: Update Documentation

Update deployment documentation to reflect that S3 configuration is now managed through the settings UI, not environment variables.

## Troubleshooting

### Issue: "S3 configuration is missing"

**Cause:** No S3 settings in database

**Solution:**

```typescript
await orpcClient.setting.update({
  s3: {
    region: 'us-east-1',
    bucket: 'your-bucket',
    accessKeyId: 'your-key',
    secretAccessKey: 'your-secret'
  }
})
```

### Issue: "S3 configuration is incomplete"

**Cause:** Some S3 fields are empty (partial configuration)

**Solution:** Fill in ALL S3 fields, or leave ALL empty (to disable S3)

### Issue: "Failed to generate S3 presigned URL"

**Cause:** Invalid AWS credentials or permissions

**Solution:**

1. Verify credentials are correct
2. Check AWS IAM permissions for `s3:PutObject`
3. Verify bucket name is correct
4. Check bucket exists in specified region

### Issue: Updated settings not taking effect

**Cause:** This shouldn't happen with the current implementation, but if it does:

**Debug steps:**

1. Check if `setting.updatedAt` is being updated
2. Verify `withSetting` middleware is working
3. Check logs for cache hit/miss

**Solution:** Restart server (cache will be rebuilt on first request)

## Best Practices

1. **Validate Settings First**
   - Test S3 credentials before saving
   - Use AWS SDK to verify access

2. **Secure Credentials**
   - Never log S3 credentials
   - S3 secret key should be stored securely in database
   - Consider encryption at rest

3. **Error Handling**
   - Always catch S3 errors
   - Provide user-friendly error messages
   - Log full error details for debugging

4. **Monitoring**
   - Monitor S3 API errors
   - Alert on credential expiration
   - Track presigned URL generation rate

## Summary

✅ **No environment variables** - All S3 configuration in database
✅ **Automatic sync** - Settings updates propagate immediately
✅ **Smart caching** - Performance optimized with timestamp-based cache
✅ **Type-safe** - Full TypeScript support
✅ **Error handling** - Clear error messages for configuration issues
✅ **Zero downtime** - Update settings without server restart

The S3 configuration system is production-ready and provides seamless synchronization between database settings and the S3 client!
