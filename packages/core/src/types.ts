import type { z } from 'zod'

// ---------------------------------------------------------------------------
// Action result types
// ---------------------------------------------------------------------------

export type FieldErrors<TSchema extends z.ZodTypeAny> = Partial<
  Record<string, string[]>
> & { _root?: string[] }

export type ActionResult<TData = void> =
  | { success: true; data?: TData }
  | { success: false; error: string }
  | { success: false; fieldErrors: Record<string, string[]> }

// ---------------------------------------------------------------------------
// Middleware types
// ---------------------------------------------------------------------------

export type MiddlewareFn<TCtxIn, TCtxOut> = (
  next: (ctx: TCtxOut) => Promise<void>,
  ctx: TCtxIn,
) => Promise<void>

// ---------------------------------------------------------------------------
// Action handler types
// ---------------------------------------------------------------------------

export type ActionHandler<
  TSchema extends z.ZodTypeAny,
  TPayload extends z.ZodTypeAny | undefined,
  TCtx,
  TData,
> = TPayload extends z.ZodTypeAny
  ? (
      data: z.output<TSchema>,
      payload: z.output<TPayload>,
      ctx: TCtx,
    ) => Promise<ActionResult<TData>> | ActionResult<TData>
  : (
      data: z.output<TSchema>,
      ctx: TCtx,
    ) => Promise<ActionResult<TData>> | ActionResult<TData>

// ---------------------------------------------------------------------------
// Action object (the result of builder.create())
// ---------------------------------------------------------------------------

export interface Action<
  TSchema extends z.ZodTypeAny,
  TPayload extends z.ZodTypeAny | undefined,
  TCtx,
  TData,
> {
  _schema: TSchema
  _payload: TPayload
  _ctx: TCtx // phantom type — never holds a value at runtime
  _data: TData // phantom type — never holds a value at runtime
  _middlewares: MiddlewareFn<unknown, unknown>[]
  _handler: ActionHandler<TSchema, TPayload, TCtx, TData>
}
