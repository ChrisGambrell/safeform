/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MiddlewareFn } from './types.js'

/**
 * Executes a middleware chain in order, composing ctx as each layer calls next().
 *
 * Each middleware receives the current ctx and a `next` function. Calling
 * next(newCtx) passes control to the next middleware with the updated ctx.
 * The final resolved ctx is returned.
 *
 * If any middleware throws, the error propagates immediately.
 *
 * @example
 * const ctx = await runMiddlewareChain(action._middlewares, {})
 * // ctx is now the fully composed context from all middleware layers
 */
export async function runMiddlewareChain(
  middlewares: MiddlewareFn<any, any>[],
  initialCtx: unknown,
): Promise<unknown> {
  let currentCtx = initialCtx

  for (const middleware of middlewares) {
    let nextCtx: unknown = currentCtx
    let nextCalled = false

    await middleware(
      async (ctx) => {
        nextCalled = true
        nextCtx = ctx
      },
      currentCtx,
    )

    if (!nextCalled) {
      throw new Error(
        'Middleware did not call next(). Every middleware must call next(ctx) to continue the chain.',
      )
    }

    currentCtx = nextCtx
  }

  return currentCtx
}
