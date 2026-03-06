import { Context } from 'hono'

/**
 * Standard success response helper
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function successResponse(c: Context, data: any, status = 200) {
  return c.json(data, status as never)
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
