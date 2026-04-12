import type { z } from 'zod'
import type { Action, ActionHandler, ActionResult, MiddlewareFn } from './types.js'

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
   * @example
   * export const upsertEmployee = authedAction.create({
   *   schema: upsertEmployeeSchema,
   *   payload: z.object({ employeeId: z.string().optional() }),
   * }, async (data, payload, ctx) => {
   *   return { success: true, data: { employeeId: '123' } }
   * })
   */
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

  create<TSchema extends z.ZodTypeAny, TData>(
    config: { schema: TSchema; payload?: undefined },
    handler: (
      data: z.output<TSchema>,
      ctx: TCtx,
    ) => Promise<ActionResult<TData>> | ActionResult<TData>,
  ): Action<TSchema, undefined, TCtx, TData>

  create<
    TSchema extends z.ZodTypeAny,
    TPayload extends z.ZodTypeAny | undefined,
    TData,
  >(
    config: { schema: TSchema; payload?: TPayload },
    handler: ActionHandler<TSchema, TPayload, TCtx, TData>,
  ): Action<TSchema, TPayload, TCtx, TData> {
    return {
      _schema: config.schema,
      _payload: config.payload as TPayload,
      _ctx: undefined as TCtx,
      _data: undefined as TData,
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
