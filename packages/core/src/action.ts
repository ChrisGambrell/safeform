import type { z } from 'zod'
import type { Action, ActionResult, MiddlewareFn } from './types.js'
import type { NamedSteps, NamedStepsOutput, MergedTupleOutput } from './schema.js'

// ---------------------------------------------------------------------------
// ActionBuilder — returned by createAction() and .use()
// ---------------------------------------------------------------------------

export class ActionBuilder<TCtx> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private middlewares: MiddlewareFn<any, any>[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(middlewares: MiddlewareFn<any, any>[] = []) {
    this.middlewares = middlewares
  }

  /**
   * Add a middleware layer. Each middleware receives the previous ctx and
   * can extend it before passing to the next layer.
   *
   * @example
   * const authedAction = createAction().use(async (next, ctx) => {
   *   const session = await getSession()
   *   if (!session) throw new Error('Unauthorized')
   *   return next({ ...ctx, user: session.user })
   * })
   */
  use<TCtxOut extends object>(
    middleware: (next: (ctx: TCtxOut) => Promise<void>, ctx: TCtx) => Promise<void>,
  ): ActionBuilder<TCtxOut> {
    return new ActionBuilder<TCtxOut>([
      ...this.middlewares,
      middleware as MiddlewareFn<unknown, unknown>,
    ])
  }

  /**
   * Create a typed action from this builder.
   *
   * Supports three schema types:
   *  - `z.object({...})` — single-step
   *  - `z.tuple([...])` — unnamed multi-step (server receives flat merged data)
   *  - `createSteps({...})` — named multi-step (server receives namespaced data)
   *
   * @example
   * export const upsertEmployee = authedAction.create({
   *   schema: upsertEmployeeSchema,
   *   payload: z.object({ employeeId: z.string().optional() }),
   * }, async (data, payload, ctx) => {
   *   return { success: true, data: { employeeId: '123' } }
   * })
   */

  // Overload 1: named steps, no payload
  create<T extends Record<string, z.ZodObject<any>>, TData>(
    config: { schema: NamedSteps<T>; payload?: undefined },
    handler: (
      data: NamedStepsOutput<NamedSteps<T>>,
      ctx: TCtx,
    ) => Promise<ActionResult<TData>> | ActionResult<TData>,
  ): Action<NamedSteps<T>, undefined, TCtx, TData>

  // Overload 2: z.tuple (unnamed multi-step), no payload
  create<TItems extends [z.ZodObject<any>, ...z.ZodObject<any>[]], TData>(
    config: { schema: z.ZodTuple<TItems>; payload?: undefined },
    handler: (
      data: MergedTupleOutput<TItems>,
      ctx: TCtx,
    ) => Promise<ActionResult<TData>> | ActionResult<TData>,
  ): Action<z.ZodTuple<TItems>, undefined, TCtx, TData>

  // Overload 3: single-step z.object with payload
  create<
    TSchema extends z.ZodTypeAny,
    TPayload extends z.ZodTypeAny,
    TData,
  >(
    config: { schema: TSchema; payload: TPayload },
    handler: (
      data: z.output<TSchema>,
      payload: z.output<TPayload>,
      ctx: TCtx,
    ) => Promise<ActionResult<TData>> | ActionResult<TData>,
  ): Action<TSchema, TPayload, TCtx, TData>

  // Overload 4: single-step z.object, no payload
  create<TSchema extends z.ZodTypeAny, TData>(
    config: { schema: TSchema; payload?: undefined },
    handler: (
      data: z.output<TSchema>,
      ctx: TCtx,
    ) => Promise<ActionResult<TData>> | ActionResult<TData>,
  ): Action<TSchema, undefined, TCtx, TData>

  // Implementation (not public API)
  create(
    config: { schema: unknown; payload?: unknown },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (...args: any[]) => any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Action<any, any, TCtx, any> {
    return {
      _schema: config.schema,
      _payload: config.payload,
      _ctx: undefined as TCtx,
      _data: undefined,
      _middlewares: this.middlewares,
      _handler: handler,
    }
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Create a base action builder with no middleware.
 *
 * @example
 * // No auth required
 * const publicAction = createAction()
 *
 * // Auth required
 * const authedAction = createAction().use(async (next, ctx) => {
 *   const session = await getSession()
 *   if (!session) throw new Error('Unauthorized')
 *   return next({ user: session.user })
 * })
 */
export function createAction(): ActionBuilder<object> {
  return new ActionBuilder<object>()
}
