/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MiddlewareFn } from './types.js'

/**
 * Executes a middleware chain in order, threading ctx through each layer.
 *
 * Each middleware receives the current ctx and returns the new ctx for the
 * next layer. If any middleware throws, the error propagates immediately.
 *
 * @example
 * const ctx = await runMiddlewareChain(action._middlewares, {})
 * // ctx is now the fully composed context from all middleware layers
 */
export async function runMiddlewareChain(
  middlewares: MiddlewareFn<any, any>[],
  initialCtx: unknown,
): Promise<unknown> {
  let ctx = initialCtx

  for (const middleware of middlewares) {
    ctx = await middleware(ctx)
  }

  return ctx
}
