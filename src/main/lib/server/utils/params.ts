import { ErrorCode } from '@shared/constants/error-codes'
import { ValidationError } from '@shared/errors/app-error'
import { Context } from 'hono'

/**
 * Gets and validates a required path parameter.
 * @throws ValidationError if parameter is missing
 */
export function getRequiredParam(c: Context, paramName: string): string {
  const value = c.req.param(paramName)
  if (!value) {
    throw new ValidationError(
      ErrorCode.VALIDATION_MISSING_FIELD,
      `${paramName} is required`
    )
  }
  return value
}

/**
 * Gets and validates a required query parameter.
 * @throws ValidationError if parameter is missing
 */
export function getRequiredQuery(c: Context, queryName: string): string {
  const value = c.req.query(queryName)
  if (!value) {
    throw new ValidationError(
      ErrorCode.VALIDATION_MISSING_FIELD,
      `${queryName} is required`
    )
  }
  return value
}

/**
 * Gets an optional query parameter with default value
 */
export function getOptionalQuery(
  c: Context,
  queryName: string,
  defaultValue: string
): string {
  return c.req.query(queryName) ?? defaultValue
}

/**
 * Parses pagination parameters from query string
 */
export function getPaginationParams(c: Context) {
  const page = Number(c.req.query('page') ?? '1')
  const pageSize = Number(c.req.query('pageSize') ?? '10')
  return { page, pageSize }
}
