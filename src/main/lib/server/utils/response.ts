import { Context } from 'hono'

/**
 * Shape returned by every mutation endpoint that doesn't echo a resource.
 * Always JSON — the renderer's `fetcher` defaults to `response.json()`, so a
 * `c.text()` body there throws a parse error even though the request succeeded.
 */
export interface MutationResult {
  success: true
  message: string
}

/** Standard success response — echoes `data` as-is. */
export function successResponse(c: Context, data: unknown, status = 200) {
  return c.json(data as object, status as never)
}

/** Standard deletion response. */
export function deletionSuccessResponse(c: Context, resourceType: string) {
  return c.json<MutationResult>({
    success: true,
    message: `${resourceType} deleted successfully`
  })
}

/** Standard update response for endpoints that don't return the updated row. */
export function updateSuccessResponse(
  c: Context,
  resourceType: string,
  id?: string
) {
  return c.json<MutationResult>({
    success: true,
    message: id
      ? `Successfully updated ${resourceType} ${id}`
      : `Successfully updated ${resourceType}`
  })
}
