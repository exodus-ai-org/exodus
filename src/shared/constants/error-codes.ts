/**
 * Application Error Codes
 *
 * Follows Anthropic-style error classification.
 * HTTP status codes are derived from the error type prefix.
 */

export enum ErrorCode {
  // ── Configuration Errors (400) ─────────────────────────────────────────────
  CONFIG_MISSING_OPENAI = 'CONFIG_MISSING_OPENAI',
  CONFIG_MISSING_EMBEDDING_MODEL = 'CONFIG_MISSING_EMBEDDING_MODEL',
  CONFIG_MISSING_CHAT_MODEL = 'CONFIG_MISSING_CHAT_MODEL',
  CONFIG_MISSING_REASONING_MODEL = 'CONFIG_MISSING_REASONING_MODEL',
  CONFIG_MISSING_PROVIDER = 'CONFIG_MISSING_PROVIDER',
  CONFIG_MISSING_BRAVE = 'CONFIG_MISSING_BRAVE',
  CONFIG_MISSING_S3 = 'CONFIG_MISSING_S3',
  CONFIG_INVALID = 'CONFIG_INVALID',

  // ── Not Found Errors (404) ─────────────────────────────────────────────────
  CHAT_NOT_FOUND = 'CHAT_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  SETTING_NOT_FOUND = 'SETTING_NOT_FOUND',
  DEEP_RESEARCH_NOT_FOUND = 'DEEP_RESEARCH_NOT_FOUND',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  MEMORY_NOT_FOUND = 'MEMORY_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  SKILL_NOT_FOUND = 'SKILL_NOT_FOUND',
  AUDIO_NOT_FOUND = 'AUDIO_NOT_FOUND',

  // ── Validation Errors (400) ────────────────────────────────────────────────
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_NO_USER_MESSAGE = 'VALIDATION_NO_USER_MESSAGE',
  VALIDATION_INVALID_INPUT = 'VALIDATION_INVALID_INPUT',
  VALIDATION_MISSING_FIELD = 'VALIDATION_MISSING_FIELD',

  // ── Rate Limit Errors (429) ────────────────────────────────────────────────
  RATE_LIMIT_CHAT = 'RATE_LIMIT_CHAT',
  RATE_LIMIT_SKILLS = 'RATE_LIMIT_SKILLS',

  // ── External Service Errors (503) ──────────────────────────────────────────
  SERVICE_OLLAMA_UNREACHABLE = 'SERVICE_OLLAMA_UNREACHABLE',
  SERVICE_OPENAI_FAILED = 'SERVICE_OPENAI_FAILED',
  SERVICE_S3_FAILED = 'SERVICE_S3_FAILED',
  SERVICE_S3_UPLOAD_FAILED = 'SERVICE_S3_UPLOAD_FAILED',
  SERVICE_S3_PRESIGN_FAILED = 'SERVICE_S3_PRESIGN_FAILED',
  SERVICE_MCP_FAILED = 'SERVICE_MCP_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // ── Database Errors (500) ──────────────────────────────────────────────────
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_SAVE_FAILED = 'DB_SAVE_FAILED',
  DB_DELETE_FAILED = 'DB_DELETE_FAILED',
  DB_IMPORT_FAILED = 'DB_IMPORT_FAILED',
  DB_EXPORT_FAILED = 'DB_EXPORT_FAILED',

  // ── File/Resource Errors (500) ─────────────────────────────────────────────
  FILE_READ_FAILED = 'FILE_READ_FAILED',
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',

  // ── AI/Model Errors (500) ──────────────────────────────────────────────────
  AI_STREAM_FAILED = 'AI_STREAM_FAILED',
  AI_GENERATION_FAILED = 'AI_GENERATION_FAILED',
  AI_EMBEDDING_FAILED = 'AI_EMBEDDING_FAILED',

  // ── Generic Errors ─────────────────────────────────────────────────────────
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Maps error codes to HTTP status codes
 */
export const ErrorCodeToStatus: Record<ErrorCode, number> = {
  // Configuration Errors
  [ErrorCode.CONFIG_MISSING_OPENAI]: 400,
  [ErrorCode.CONFIG_MISSING_EMBEDDING_MODEL]: 400,
  [ErrorCode.CONFIG_MISSING_CHAT_MODEL]: 400,
  [ErrorCode.CONFIG_MISSING_REASONING_MODEL]: 400,
  [ErrorCode.CONFIG_MISSING_PROVIDER]: 400,
  [ErrorCode.CONFIG_MISSING_BRAVE]: 400,
  [ErrorCode.CONFIG_MISSING_S3]: 400,
  [ErrorCode.CONFIG_INVALID]: 400,

  // Not Found Errors
  [ErrorCode.CHAT_NOT_FOUND]: 404,
  [ErrorCode.MESSAGE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.SETTING_NOT_FOUND]: 404,
  [ErrorCode.DEEP_RESEARCH_NOT_FOUND]: 404,
  [ErrorCode.AGENT_NOT_FOUND]: 404,
  [ErrorCode.TASK_NOT_FOUND]: 404,
  [ErrorCode.MEMORY_NOT_FOUND]: 404,
  [ErrorCode.PROJECT_NOT_FOUND]: 404,
  [ErrorCode.SKILL_NOT_FOUND]: 404,
  [ErrorCode.AUDIO_NOT_FOUND]: 404,

  // Validation Errors
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.VALIDATION_NO_USER_MESSAGE]: 400,
  [ErrorCode.VALIDATION_INVALID_INPUT]: 400,
  [ErrorCode.VALIDATION_MISSING_FIELD]: 400,

  // Rate Limit Errors
  [ErrorCode.RATE_LIMIT_CHAT]: 429,
  [ErrorCode.RATE_LIMIT_SKILLS]: 429,

  // External Service Errors
  [ErrorCode.SERVICE_OLLAMA_UNREACHABLE]: 503,
  [ErrorCode.SERVICE_OPENAI_FAILED]: 503,
  [ErrorCode.SERVICE_S3_FAILED]: 503,
  [ErrorCode.SERVICE_S3_UPLOAD_FAILED]: 503,
  [ErrorCode.SERVICE_S3_PRESIGN_FAILED]: 503,
  [ErrorCode.SERVICE_MCP_FAILED]: 503,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,

  // Database Errors
  [ErrorCode.DB_QUERY_FAILED]: 500,
  [ErrorCode.DB_CONNECTION_FAILED]: 500,
  [ErrorCode.DB_SAVE_FAILED]: 500,
  [ErrorCode.DB_DELETE_FAILED]: 500,
  [ErrorCode.DB_IMPORT_FAILED]: 500,
  [ErrorCode.DB_EXPORT_FAILED]: 500,

  // File/Resource Errors
  [ErrorCode.FILE_READ_FAILED]: 500,
  [ErrorCode.FILE_WRITE_FAILED]: 500,
  [ErrorCode.FILE_UPLOAD_FAILED]: 500,
  [ErrorCode.PDF_GENERATION_FAILED]: 500,

  // AI/Model Errors
  [ErrorCode.AI_STREAM_FAILED]: 500,
  [ErrorCode.AI_GENERATION_FAILED]: 500,
  [ErrorCode.AI_EMBEDDING_FAILED]: 500,

  // Generic Errors
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.UNKNOWN_ERROR]: 500
}

/**
 * User-friendly error messages for each error code
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Configuration Errors
  [ErrorCode.CONFIG_MISSING_OPENAI]:
    'OpenAI configuration is missing. Please configure OpenAI API key in settings.',
  [ErrorCode.CONFIG_MISSING_EMBEDDING_MODEL]:
    'Embedding model is missing. Please check your settings.',
  [ErrorCode.CONFIG_MISSING_CHAT_MODEL]:
    'Chat model is missing. Please configure a chat model in settings.',
  [ErrorCode.CONFIG_MISSING_REASONING_MODEL]:
    'Reasoning model is missing. Please configure a reasoning model in settings.',
  [ErrorCode.CONFIG_MISSING_PROVIDER]:
    'No AI provider selected. Please choose a provider in Settings → AI Providers.',
  [ErrorCode.CONFIG_MISSING_BRAVE]:
    'Web search requires a Brave Search API key. Please configure it in Settings → Web Search.',
  [ErrorCode.CONFIG_MISSING_S3]:
    'S3 configuration is incomplete. Please configure AWS credentials in settings.',
  [ErrorCode.CONFIG_INVALID]:
    'Configuration is invalid. Please check your settings.',

  // Not Found Errors
  [ErrorCode.CHAT_NOT_FOUND]: 'Chat not found.',
  [ErrorCode.MESSAGE_NOT_FOUND]: 'Message not found.',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found.',
  [ErrorCode.SETTING_NOT_FOUND]: 'Settings not found. Please restart the app.',
  [ErrorCode.DEEP_RESEARCH_NOT_FOUND]: 'Deep research not found.',
  [ErrorCode.AGENT_NOT_FOUND]: 'Agent or department not found.',
  [ErrorCode.TASK_NOT_FOUND]: 'Task not found.',
  [ErrorCode.MEMORY_NOT_FOUND]: 'Memory not found.',
  [ErrorCode.PROJECT_NOT_FOUND]: 'Project not found.',
  [ErrorCode.SKILL_NOT_FOUND]: 'Skill not found.',
  [ErrorCode.AUDIO_NOT_FOUND]: 'Audio file not found.',

  // Validation Errors
  [ErrorCode.VALIDATION_FAILED]: 'Input validation failed.',
  [ErrorCode.VALIDATION_NO_USER_MESSAGE]:
    'No user message found in the request.',
  [ErrorCode.VALIDATION_INVALID_INPUT]: 'Invalid input provided.',
  [ErrorCode.VALIDATION_MISSING_FIELD]: 'Required field is missing.',

  // Rate Limit Errors
  [ErrorCode.RATE_LIMIT_CHAT]:
    'You have exceeded your maximum number of messages. Please try again later.',
  [ErrorCode.RATE_LIMIT_SKILLS]:
    'Too many requests to the skill registry. Please try again later.',

  // External Service Errors
  [ErrorCode.SERVICE_OLLAMA_UNREACHABLE]:
    'Ollama service is not reachable. Please check if Ollama is running.',
  [ErrorCode.SERVICE_OPENAI_FAILED]:
    'OpenAI service failed. Please try again later.',
  [ErrorCode.SERVICE_S3_FAILED]: 'S3 service failed. Please try again later.',
  [ErrorCode.SERVICE_S3_UPLOAD_FAILED]:
    'Failed to upload file to S3. Please check your S3 configuration.',
  [ErrorCode.SERVICE_S3_PRESIGN_FAILED]:
    'Failed to generate S3 presigned URL. Please check your S3 configuration.',
  [ErrorCode.SERVICE_MCP_FAILED]:
    'MCP service failed. Please check your MCP configuration.',
  [ErrorCode.SERVICE_UNAVAILABLE]:
    'External service is unavailable. Please try again later.',

  // Database Errors
  [ErrorCode.DB_QUERY_FAILED]: 'Database query failed.',
  [ErrorCode.DB_CONNECTION_FAILED]: 'Failed to connect to database.',
  [ErrorCode.DB_SAVE_FAILED]: 'Failed to save to database.',
  [ErrorCode.DB_DELETE_FAILED]: 'Failed to delete from database.',
  [ErrorCode.DB_IMPORT_FAILED]: 'Failed to import data.',
  [ErrorCode.DB_EXPORT_FAILED]: 'Failed to export data.',

  // File/Resource Errors
  [ErrorCode.FILE_READ_FAILED]: 'Failed to read file.',
  [ErrorCode.FILE_WRITE_FAILED]: 'Failed to write file.',
  [ErrorCode.FILE_UPLOAD_FAILED]: 'Failed to upload file.',
  [ErrorCode.PDF_GENERATION_FAILED]: 'Failed to generate PDF.',

  // AI/Model Errors
  [ErrorCode.AI_STREAM_FAILED]: 'AI streaming failed.',
  [ErrorCode.AI_GENERATION_FAILED]: 'AI generation failed.',
  [ErrorCode.AI_EMBEDDING_FAILED]: 'AI embedding generation failed.',

  // Generic Errors
  [ErrorCode.INTERNAL_ERROR]: 'Internal server error occurred.',
  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred.'
}
