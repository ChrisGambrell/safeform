import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createAction } from './action.js'

const schema = z.object({
  name: z.string(),
  age: z.number(),
})

// ---------------------------------------------------------------------------
// A-1: createAction() factory
// ---------------------------------------------------------------------------

describe('createAction()', () => {
  it('returns an ActionBuilder', () => {
    const builder = createAction()
    expect(builder).toBeDefined()
    expect(typeof builder.use).toBe('function')
    expect(typeof builder.create).toBe('function')
  })

  it('builder.create() produces a correctly shaped action object', () => {
    const action = createAction().create({ schema }, async (data, _ctx) => ({
      success: true as const,
      data: { created: true },
    }))

    expect(action._schema).toBe(schema)
    expect(action._payload).toBeUndefined()
    expect(action._middlewares).toHaveLength(0)
    expect(typeof action._handler).toBe('function')
  })

  it('builder.create() with payload schema stores payload schema', () => {
    const payload = z.object({ id: z.string() })
    const action = createAction().create({ schema, payload }, async (data, _payload, _ctx) => ({
      success: true as const,
    }))

    expect(action._schema).toBe(schema)
    expect(action._payload).toBe(payload)
  })

  it('handler receives correctly typed data from schema', async () => {
    const handler = vi.fn(async (data: z.output<typeof schema>, _ctx: object) => ({
      success: true as const,
      data,
    }))

    const action = createAction().create({ schema }, handler)
    const input = { name: 'Alice', age: 30 }
    await action._handler(input, {} as object)

    expect(handler).toHaveBeenCalledWith(input, {})
  })

  it('handler receives data and payload when payload schema provided', async () => {
    const payload = z.object({ facilityId: z.string() })
    const handler = vi.fn(
      async (data: z.output<typeof schema>, p: z.output<typeof payload>, _ctx: object) => ({
        success: true as const,
      }),
    )

    const action = createAction().create({ schema, payload }, handler)
    await action._handler({ name: 'Bob', age: 25 }, { facilityId: 'fac-1' }, {} as object)

    expect(handler).toHaveBeenCalledWith({ name: 'Bob', age: 25 }, { facilityId: 'fac-1' }, {})
  })
})

// ---------------------------------------------------------------------------
// A-2: .use(middleware) layer
// ---------------------------------------------------------------------------

describe('.use(middleware)', () => {
  it('returns a new ActionBuilder (immutable — original unchanged)', () => {
    const base = createAction()
    const withMiddleware = base.use(async (next, ctx) => next({ ...ctx, user: 'alice' }))

    expect(withMiddleware).not.toBe(base)
  })

  it('adds middleware to the chain', () => {
    const mw1 = vi.fn(async (next: (ctx: object) => Promise<void>, ctx: object) => next(ctx))
    const action = createAction()
      .use(mw1)
      .create({ schema }, async (_data, _ctx) => ({
        success: true as const,
      }))

    expect(action._middlewares).toHaveLength(1)
    expect(action._middlewares[0]).toBe(mw1)
  })

  it('stacks multiple middleware layers in order', () => {
    const mw1 = vi.fn(async (next: (ctx: object) => Promise<void>, ctx: object) => next(ctx))
    const mw2 = vi.fn(async (next: (ctx: object) => Promise<void>, ctx: object) => next(ctx))
    const mw3 = vi.fn(async (next: (ctx: object) => Promise<void>, ctx: object) => next(ctx))

    const action = createAction()
      .use(mw1)
      .use(mw2)
      .use(mw3)
      .create({ schema }, async (_data, _ctx) => ({ success: true as const }))

    expect(action._middlewares).toHaveLength(3)
    expect(action._middlewares[0]).toBe(mw1)
    expect(action._middlewares[1]).toBe(mw2)
    expect(action._middlewares[2]).toBe(mw3)
  })

  it('middleware can extend ctx with new properties', async () => {
    const receivedCtx = { value: '' }

    const action = createAction()
      .use(async (next, ctx) => next({ ...ctx, role: 'admin' }))
      .create({ schema }, async (_data, ctx) => {
        receivedCtx.value = (ctx as { role: string }).role
        return { success: true as const }
      })

    // Simulate what the route handler will do: run middleware chain then handler
    let finalCtx: object = {}
    for (const mw of action._middlewares) {
      await (mw as (next: (ctx: object) => Promise<void>, ctx: object) => Promise<void>)(
        async (ctx) => {
          finalCtx = ctx
        },
        finalCtx,
      )
    }
    await action._handler({ name: 'Alice', age: 30 }, finalCtx)

    expect(receivedCtx.value).toBe('admin')
  })

  it('middleware throwing propagates the error', async () => {
    const action = createAction()
      .use(async (_next, _ctx) => {
        throw new Error('Unauthorized')
      })
      .create({ schema }, async (_data, _ctx) => ({ success: true as const }))

    const runMiddleware = async () => {
      for (const mw of action._middlewares) {
        await (mw as (next: (ctx: object) => Promise<void>, ctx: object) => Promise<void>)(
          async () => {},
          {},
        )
      }
    }

    await expect(runMiddleware()).rejects.toThrow('Unauthorized')
  })
})
