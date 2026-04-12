import type { z } from 'zod'
import {
  runMiddlewareChain,
  isZodTuple,
  isNamedSteps,
  mergeStepData,
  namespaceStepData,
} from 'safeform'
import type { Action, AnySchema } from 'safeform'

// ---------------------------------------------------------------------------
// Error messages used internally and in tests
// ---------------------------------------------------------------------------

export const ERRORS = {
  INVALID_JSON: 'Invalid JSON body',
  INVALID_PAYLOAD: 'Invalid payload',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  INTERNAL: 'Internal server error',
} as const

// ---------------------------------------------------------------------------
// Parse the incoming request body
// R-2: Extract { data, payload } from JSON
// ---------------------------------------------------------------------------

async function parseBody(
  req: Request,
): Promise<{ data: unknown; payload?: unknown } | null> {
  try {
    const body = (await req.json()) as unknown
    if (typeof body !== 'object' || body === null) return null
    return body as { data: unknown; payload?: unknown }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Validate the schema and return parsed data (or field errors)
// ---------------------------------------------------------------------------

type ParseResult =
  | { ok: true; data: unknown }
  | { ok: false; fieldErrors: Record<string, string[]> }

function parseSchema(schema: unknown, rawData: unknown): ParseResult {
  const fieldErrors: Record<string, string[]> = {}

  if (isNamedSteps(schema)) {
    const stepNames = Object.keys(schema._steps)
    const stepSchemas = Object.values(schema._steps)
    const stepData = Array.isArray(rawData) ? rawData : []
    const parsedSteps: unknown[] = []

    for (let i = 0; i < stepSchemas.length; i++) {
      const result = stepSchemas[i]!.safeParse(stepData[i])
      if (!result.success) {
        const stepName = stepNames[i]!
        for (const issue of result.error.issues) {
          const key = [stepName, ...issue.path].join('.')
          fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
        }
      } else {
        parsedSteps.push(result.data)
      }
    }

    if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
    return { ok: true, data: namespaceStepData(parsedSteps, stepNames) }
  }

  if (isZodTuple(schema)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepSchemas = schema.items as z.ZodObject<any>[]
    const stepData = Array.isArray(rawData) ? rawData : []
    const parsedSteps: unknown[] = []

    for (let i = 0; i < stepSchemas.length; i++) {
      const result = stepSchemas[i]!.safeParse(stepData[i])
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path.join('.')
          fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
        }
      } else {
        parsedSteps.push(result.data)
      }
    }

    if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
    return { ok: true, data: mergeStepData(parsedSteps) }
  }

  // Single-step z.ZodObject
  const result = (schema as z.ZodTypeAny).safeParse(rawData)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path.join('.')
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
    }
    return { ok: false, fieldErrors }
  }
  return { ok: true, data: result.data }
}

// ---------------------------------------------------------------------------
// R-1: createRouteHandler — Next.js App Router adapter
// ---------------------------------------------------------------------------

/**
 * Mount a safeform action as a Next.js App Router POST handler.
 *
 * @example
 * // app/api/employees/route.ts
 * import { createRouteHandler } from '@safeform/next'
 * import { upsertEmployeeAction } from '@/actions/employees'
 *
 * export const POST = createRouteHandler(upsertEmployeeAction)
 */
export function createRouteHandler<
  TSchema extends AnySchema,
  TPayload extends z.ZodTypeAny | undefined,
  TCtx,
  TData,
>(action: Action<TSchema, TPayload, TCtx, TData>) {
  return async function POST(req: Request): Promise<Response> {
    // R-2: Parse JSON body
    const body = await parseBody(req)
    if (body === null) {
      return Response.json({ success: false, error: ERRORS.INVALID_JSON }, { status: 400 })
    }

    // Run middleware chain
    let ctx: unknown
    try {
      ctx = await runMiddlewareChain(action._middlewares, {})
    } catch (err) {
      const message = err instanceof Error ? err.message : ERRORS.UNAUTHORIZED
      if (message === 'Unauthorized') {
        return Response.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })
      }
      if (message === 'Forbidden') {
        return Response.json({ success: false, error: ERRORS.FORBIDDEN }, { status: 403 })
      }
      return Response.json({ success: false, error: ERRORS.INTERNAL }, { status: 500 })
    }

    // Parse + validate schema
    const parsed = parseSchema(action._schema, body.data)
    if (!parsed.ok) {
      return Response.json({ success: false, fieldErrors: parsed.fieldErrors }, { status: 422 })
    }

    // Parse + validate payload
    let parsedPayload: unknown = undefined
    if (action._payload) {
      const payloadResult = action._payload.safeParse(body.payload)
      if (!payloadResult.success) {
        return Response.json(
          { success: false, error: ERRORS.INVALID_PAYLOAD },
          { status: 400 },
        )
      }
      parsedPayload = payloadResult.data
    }

    // Call handler
    let handlerResult: unknown
    try {
      if (action._payload !== undefined) {
        handlerResult = await (
          action._handler as (
            data: unknown,
            payload: unknown,
            ctx: unknown,
          ) => Promise<unknown>
        )(parsed.data, parsedPayload, ctx)
      } else {
        handlerResult = await (
          action._handler as (data: unknown, ctx: unknown) => Promise<unknown>
        )(parsed.data, ctx)
      }
    } catch (err) {
      console.error('[safeform] Unexpected handler error:', err)
      return Response.json({ success: false, error: ERRORS.INTERNAL }, { status: 500 })
    }

    const result = handlerResult as {
      success: boolean
      data?: unknown
      error?: string
      fieldErrors?: Record<string, string[]>
    }

    if (!result.success) {
      if ('fieldErrors' in result) {
        return Response.json({ success: false, fieldErrors: result.fieldErrors }, { status: 422 })
      }
      return Response.json({ success: false, error: result.error }, { status: 400 })
    }

    return Response.json({ success: true, data: result.data ?? null }, { status: 200 })
  }
}
