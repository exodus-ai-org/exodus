export type ErrorType =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit'
  | 'offline'

export type Surface =
  | 'chat'
  | 'auth'
  | 'api'
  | 'stream'
  | 'database'
  | 'history'
  | 'vote'
  | 'document'
  | 'suggestions'
  | 'activate_gateway'
  | 'deep_research'
  | 'audio'
  | 'setting'
  | 'agent_x'
  | 'mcp'
  | 's3'
  | 'memory'
  | 'skills'

export type ErrorCode = `${ErrorType}:${Surface}`

export type ErrorVisibility = 'response' | 'log' | 'none'

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: 'log',
  chat: 'response',
  auth: 'response',
  stream: 'response',
  api: 'response',
  history: 'response',
  vote: 'response',
  document: 'response',
  suggestions: 'response',
  activate_gateway: 'response',
  deep_research: 'response',
  audio: 'response',
  setting: 'response',
  agent_x: 'response',
  mcp: 'response',
  s3: 'response',
  memory: 'response',
  skills: 'response'
}

import { logger, type LogSurface } from '../logger'

export class ChatSDKError extends Error {
  type: ErrorType
  surface: Surface
  statusCode: number

  constructor(errorCode: ErrorCode, cause?: string) {
    super()

    const [type, surface] = errorCode.split(':')

    this.type = type as ErrorType
    this.cause = cause
    this.surface = surface as Surface
    this.message = getMessageByErrorCode(errorCode)
    this.statusCode = getStatusCodeByType(this.type)
  }

  toResponse() {
    const code: ErrorCode = `${this.type}:${this.surface}`
    const visibility = visibilityBySurface[this.surface]

    const { message, cause, statusCode } = this

    if (visibility === 'log') {
      logger.error(this.surface as LogSurface, message, {
        code: code as string,
        cause: cause as string
      })

      return Response.json(
        { code: '', message: 'Something went wrong. Please try again later.' },
        { status: statusCode }
      )
    }

    return Response.json({ code, message, cause }, { status: statusCode })
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  if (errorCode.includes('database')) {
    return 'An error occurred while executing a database query.'
  }

  switch (errorCode) {
    case 'bad_request:api':
      return "The request couldn't be processed. Please check your input and try again."

    case 'bad_request:activate_gateway':
      return 'AI Gateway requires a valid credit card on file to service requests. Please visit https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card to add a card and unlock your free credits.'

    case 'unauthorized:auth':
      return 'You need to sign in before continuing.'
    case 'forbidden:auth':
      return 'Your account does not have access to this feature.'

    case 'rate_limit:chat':
      return 'You have exceeded your maximum number of messages for the day. Please try again later.'
    case 'not_found:chat':
      return 'The requested chat was not found. Please check the chat ID and try again.'
    case 'forbidden:chat':
      return 'This chat belongs to another user. Please check the chat ID and try again.'
    case 'unauthorized:chat':
      return 'You need to sign in to view this chat. Please sign in and try again.'
    case 'offline:chat':
      return "We're having trouble sending your message. Please check your internet connection and try again."

    case 'not_found:document':
      return 'The requested document was not found. Please check the document ID and try again.'
    case 'forbidden:document':
      return 'This document belongs to another user. Please check the document ID and try again.'
    case 'unauthorized:document':
      return 'You need to sign in to view this document. Please sign in and try again.'
    case 'bad_request:document':
      return 'The request to create or update the document was invalid. Please check your input and try again.'

    case 'not_found:setting':
      return 'Setting configuration not found. Please check your settings.'
    case 'bad_request:setting':
      return 'Invalid setting configuration. Please check your input and try again.'

    case 'not_found:deep_research':
      return 'The requested research was not found. Please check the research ID and try again.'
    case 'bad_request:deep_research':
      return 'Failed to start deep research. Please check your input and try again.'
    case 'forbidden:deep_research':
      return 'Deep research requires a Perplexity API key. Please configure it in settings.'

    case 'not_found:audio':
      return 'Audio file not found or missing.'
    case 'bad_request:audio':
      return 'Invalid audio request. Please check your input and try again.'
    case 'forbidden:audio':
      return 'OpenAI configuration is missing. Please configure it in settings.'

    case 'not_found:agent_x':
      return 'The requested agent or department was not found.'
    case 'bad_request:agent_x':
      return 'Invalid Agent X configuration. Please check your input and try again.'

    case 'bad_request:mcp':
      return 'Failed to connect to MCP server. Please check your MCP configuration.'

    case 'forbidden:s3':
      return 'S3 configuration is incomplete. Please configure AWS credentials in settings.'
    case 'bad_request:s3':
      return 'Failed to process S3 request. Please check your input and try again.'
    case 'not_found:s3':
      return 'The requested file was not found in S3 storage.'

    case 'bad_request:skills':
      return 'Failed to process skill operation. Please try again.'
    case 'not_found:skills':
      return 'The requested skill was not found.'
    case 'rate_limit:skills':
      return 'Too many requests to the skill registry. Please try again later.'

    case 'bad_request:memory':
      return 'Failed to process memory operation. Please check your input and try again.'
    case 'not_found:memory':
      return 'The requested memory was not found.'

    default:
      return 'Something went wrong. Please try again later.'
  }
}

function getStatusCodeByType(type: ErrorType) {
  switch (type) {
    case 'bad_request':
      return 400
    case 'unauthorized':
      return 401
    case 'forbidden':
      return 403
    case 'not_found':
      return 404
    case 'rate_limit':
      return 429
    case 'offline':
      return 503
    default:
      return 500
  }
}
