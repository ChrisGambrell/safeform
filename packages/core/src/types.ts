import type { z } from 'zod'
import type { NamedSteps } from './schema.js'

// ---------------------------------------------------------------------------
// Any schema that safeform accepts
// ---------------------------------------------------------------------------

/** All schema types accepted by safeform — plain Zod types or named multi-step */
export type AnySchema = z.ZodTypeAny | NamedSteps<Record<string, z.ZodObject<any>>>

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
  TData,
  TCtx,
  TPayload extends z.ZodTypeAny | undefined = undefined,
> = TPayload extends z.ZodTypeAny
  ? (
      data: unknown,
      payload: z.output<TPayload>,
      ctx: TCtx,
    ) => Promise<ActionResult<TData>> | ActionResult<TData>
  : (
      data: unknown,
      ctx: TCtx,
    ) => Promise<ActionResult<TData>> | ActionResult<TData>

// ---------------------------------------------------------------------------
// Action object (the result of builder.create())
// ---------------------------------------------------------------------------

export interface Action<
  TSchema extends AnySchema,
  TPayload extends z.ZodTypeAny | undefined,
  TCtx,
  TData,
> {
  _schema: TSchema
  _payload: TPayload
  _ctx: TCtx // phantom type — never holds a value at runtime
  _data: TData // phantom type — never holds a value at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _middlewares: MiddlewareFn<any, any>[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _handler: ActionHandler<TData, TCtx, any>
}
