import { S3Client } from '@aws-sdk/client-s3'
import { os } from '@orpc/server'
import { ErrorCode } from '@shared/constants/error-codes'
import { ConfigurationError } from '@shared/errors'
import { Setting } from '@shared/types/db'
import { createS3Client } from '../utils'
import { withSetting } from './with-setting'

let cachedClient: S3Client | null = null
let cachedVersion: string | null = null

/**
 * Middleware that provides S3 client with automatic cache invalidation
 * Cache is invalidated when setting.updatedAt changes
 */
export const withS3 = withSetting.concat(
  os.$context<{ setting: Setting }>().middleware(async ({ context, next }) => {
    const { setting } = context

    // Check if S3 is configured
    if (!setting.s3) {
      throw new ConfigurationError(
        ErrorCode.CONFIG_INVALID,
        'S3 configuration is missing. Please configure S3 in settings.'
      )
    }

    const { region, bucket, accessKeyId, secretAccessKey } = setting.s3

    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
      throw new ConfigurationError(
        ErrorCode.CONFIG_INVALID,
        'S3 configuration is incomplete. Please fill in all S3 fields in settings.'
      )
    }

    // Use updatedAt as cache version - when settings change, updatedAt changes
    const version = setting.updatedAt.toISOString()

    // Return cached client if settings haven't changed
    if (cachedClient && cachedVersion === version) {
      return next({
        context: {
          ...context,
          s3: {
            client: cachedClient,
            bucket
          }
        }
      })
    }

    // Create new client with current settings
    const client = createS3Client(setting)

    // Update cache
    cachedClient = client
    cachedVersion = version

    return next({
      context: {
        ...context,
        s3: {
          client,
          bucket
        }
      }
    })
  })
)
