import type { Request } from 'express'

export interface PageParams {
  limit: number
  offset: number
}

/**
 * Parse optional `limit`/`offset` (or `page`) query params into a bounded
 * pagination window. Returns `undefined` when the request asks for no
 * pagination, so callers can keep returning the full list (backward compatible).
 */
export function parsePageParams(
  req: Request,
  opts: { defaultLimit?: number; maxLimit?: number } = {},
): PageParams | undefined {
  const maxLimit = opts.maxLimit ?? 100
  const hasLimit = req.query.limit !== undefined
  const hasOffset = req.query.offset !== undefined
  const hasPage = req.query.page !== undefined
  if (!hasLimit && !hasOffset && !hasPage && opts.defaultLimit === undefined) return undefined

  const limit = clampInt(req.query.limit, opts.defaultLimit ?? 20, 1, maxLimit)
  let offset = clampInt(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER)
  if (hasPage) {
    const page = clampInt(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER)
    offset = (page - 1) * limit
  }
  return { limit, offset }
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
