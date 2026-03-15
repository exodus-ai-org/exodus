import { Context } from 'hono'

/**
 * Standard success response helper
 */
export function successResponse(c: Context, data: unknown, status = 200) {
  return c.json(data as object, status as never)
}

/**
 * Standard deletion success response
 */
export function deletionSuccessResponse(c: Context, resourceType: string) {
  return c.text(`${resourceType} deleted successfully`, 200)
}

/**
 * Standard update success response
 */
export function updateSuccessResponse(
  c: Context,
  resourceType: string,
  id?: string
) {
  const message = id
    ? `Successfully updated ${resourceType} ${id}`
    : `Successfully updated ${resourceType}`
  return c.text(message, 200)
}
