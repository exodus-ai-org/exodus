import { describe, expect, it } from 'vitest'

import {
  ErrorCode,
  ErrorCodeToStatus,
  ErrorMessages
} from '../constants/error-codes'
import {
  AIError,
  AppError,
  ConfigurationError,
  DatabaseError,
  FileError,
  InternalError,
  NotFoundError,
  ServiceError,
  ValidationError,
  isAppError,
  toAppError
} from './app-error'

describe('AppError', () => {
  it('should create an error with code and default message', () => {
    const err = new AppError(ErrorCode.INTERNAL_ERROR)
    expect(err.code).toBe(ErrorCode.INTERNAL_ERROR)
    expect(err.message).toBe(ErrorMessages[ErrorCode.INTERNAL_ERROR])
    expect(err.statusCode).toBe(500)
    expect(err.isOperational).toBe(true)
  })

  it('should create an error with custom message', () => {
    const err = new AppError(ErrorCode.CHAT_NOT_FOUND, 'Chat 123 not found')
    expect(err.message).toBe('Chat 123 not found')
    expect(err.statusCode).toBe(404)
  })

  it('should include metadata', () => {
    const metadata = { chatId: '123' }
    const err = new AppError(ErrorCode.CHAT_NOT_FOUND, undefined, metadata)
    expect(err.metadata).toEqual(metadata)
  })

  it('should serialize to JSON', () => {
    const err = new AppError(ErrorCode.VALIDATION_FAILED, 'Bad input')
    const json = err.toJSON()
    expect(json).toEqual({
      error: {
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Bad input',
        statusCode: 400,
        metadata: undefined
      }
    })
  })
})

describe('Error subclasses', () => {
  it('ConfigurationError defaults to CONFIG_INVALID', () => {
    const err = new ConfigurationError()
    expect(err.code).toBe(ErrorCode.CONFIG_INVALID)
    expect(err.statusCode).toBe(400)
    expect(err).toBeInstanceOf(AppError)
  })

  it('NotFoundError defaults to RESOURCE_NOT_FOUND', () => {
    const err = new NotFoundError()
    expect(err.code).toBe(ErrorCode.RESOURCE_NOT_FOUND)
    expect(err.statusCode).toBe(404)
  })

  it('ValidationError defaults to VALIDATION_FAILED', () => {
    const err = new ValidationError()
    expect(err.code).toBe(ErrorCode.VALIDATION_FAILED)
    expect(err.statusCode).toBe(400)
  })

  it('ServiceError defaults to SERVICE_UNAVAILABLE', () => {
    const err = new ServiceError()
    expect(err.code).toBe(ErrorCode.SERVICE_UNAVAILABLE)
    expect(err.statusCode).toBe(503)
  })

  it('DatabaseError defaults to DB_QUERY_FAILED', () => {
    const err = new DatabaseError()
    expect(err.code).toBe(ErrorCode.DB_QUERY_FAILED)
    expect(err.statusCode).toBe(500)
  })

  it('FileError defaults to FILE_READ_FAILED', () => {
    const err = new FileError()
    expect(err.code).toBe(ErrorCode.FILE_READ_FAILED)
    expect(err.statusCode).toBe(500)
  })

  it('AIError defaults to AI_GENERATION_FAILED', () => {
    const err = new AIError()
    expect(err.code).toBe(ErrorCode.AI_GENERATION_FAILED)
    expect(err.statusCode).toBe(500)
  })

  it('InternalError is non-operational', () => {
    const err = new InternalError('Something broke')
    expect(err.code).toBe(ErrorCode.INTERNAL_ERROR)
    expect(err.isOperational).toBe(false)
  })
})

describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    expect(isAppError(new AppError(ErrorCode.INTERNAL_ERROR))).toBe(true)
    expect(isAppError(new NotFoundError())).toBe(true)
  })

  it('returns false for regular errors', () => {
    expect(isAppError(new Error('oops'))).toBe(false)
    expect(isAppError('string')).toBe(false)
    expect(isAppError(null)).toBe(false)
  })
})

describe('toAppError', () => {
  it('returns AppError as-is', () => {
    const original = new NotFoundError()
    expect(toAppError(original)).toBe(original)
  })

  it('wraps regular Error as InternalError', () => {
    const err = toAppError(new Error('oops'))
    expect(err).toBeInstanceOf(InternalError)
    expect(err.message).toBe('oops')
  })

  it('wraps unknown values as InternalError', () => {
    const err = toAppError('unexpected')
    expect(err).toBeInstanceOf(InternalError)
    expect(err.message).toBe('An unknown error occurred')
  })
})

describe('ErrorCode completeness', () => {
  it('every ErrorCode has a status mapping', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(ErrorCodeToStatus[code]).toBeDefined()
    }
  })

  it('every ErrorCode has a message', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(ErrorMessages[code]).toBeDefined()
      expect(typeof ErrorMessages[code]).toBe('string')
    }
  })
})
