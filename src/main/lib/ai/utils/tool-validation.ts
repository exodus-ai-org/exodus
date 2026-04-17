import { logger } from '../../logger'

/**
 * Validate tool call arguments against a JSON Schema definition.
 * Returns validated (and coerced) arguments, or the original arguments
 * with a warning if validation fails (graceful degradation).
 *
 * This is primarily useful for MCP tools where schemas come from external
 * servers and the LLM may produce slightly mismatched types.
 */
export function validateToolArgs(
  toolName: string,
  args: Record<string, unknown>,
  schema: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!schema || !schema.properties) return args

  const properties = schema.properties as Record<
    string,
    { type?: string; enum?: unknown[] }
  >
  const required = new Set((schema.required as string[]) ?? [])
  const errors: string[] = []

  // Check required fields
  for (const field of required) {
    if (args[field] === undefined || args[field] === null) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Basic type coercion and validation
  const coerced = { ...args }
  for (const [key, prop] of Object.entries(properties)) {
    if (coerced[key] === undefined) continue

    if (prop.type === 'number' || prop.type === 'integer') {
      const num = Number(coerced[key])
      if (!isNaN(num)) coerced[key] = num
      else
        errors.push(
          `Field '${key}' expected ${prop.type}, got '${typeof coerced[key]}'`
        )
    } else if (prop.type === 'boolean') {
      if (typeof coerced[key] === 'string') {
        coerced[key] = coerced[key] === 'true'
      }
    } else if (prop.type === 'string' && typeof coerced[key] !== 'string') {
      coerced[key] = String(coerced[key])
    }

    // Enum validation
    if (prop.enum && !prop.enum.includes(coerced[key])) {
      errors.push(
        `Field '${key}' must be one of [${prop.enum.join(', ')}], got '${coerced[key]}'`
      )
    }
  }

  if (errors.length > 0) {
    logger.warn(
      'tools',
      `Tool argument validation warnings for '${toolName}'`,
      {
        errors,
        args
      }
    )
  }

  return coerced
}
