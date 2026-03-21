import { S3Client } from '@aws-sdk/client-s3'

import { Setting } from '../../db/schema'
import { ChatSDKError } from '../errors'

/**
 * Validates that S3 configuration is complete
 * @throws ChatSDKError if configuration is incomplete
 */
export function validateS3Config(setting: Setting) {
  const s3Config = setting.s3

  if (
    !s3Config?.region ||
    !s3Config?.accessKeyId ||
    !s3Config?.secretAccessKey
  ) {
    throw new ChatSDKError('forbidden:s3')
  }

  if (!s3Config?.bucket) {
    throw new ChatSDKError('forbidden:s3', 'S3 bucket is not configured')
  }

  return {
    region: s3Config.region as string,
    bucket: s3Config.bucket as string,
    accessKeyId: s3Config.accessKeyId as string,
    secretAccessKey: s3Config.secretAccessKey as string
  }
}

/**
 * Validates that OpenAI configuration exists
 * @throws ChatSDKError if configuration is missing
 */
export function validateOpenAIConfig(setting: Setting) {
  if (!setting?.providers?.openaiApiKey) {
    throw new ChatSDKError('forbidden:audio')
  }

  return {
    baseURL: setting.providers?.openaiBaseUrl,
    apiKey: setting.providers.openaiApiKey
  }
}

/**
 * Validates that Perplexity API key exists
 * @throws ChatSDKError if API key is missing
 */
export function validatePerplexityApiKey(setting: Setting) {
  if (!setting.webSearch?.perplexityApiKey) {
    throw new ChatSDKError('forbidden:deep_research')
  }

  return setting.webSearch.perplexityApiKey
}

/**
 * Creates an S3 client from validated settings
 */
export function createS3ClientFromSettings(setting: Setting): S3Client {
  const s3Config = validateS3Config(setting)

  return new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey
    }
  })
}
