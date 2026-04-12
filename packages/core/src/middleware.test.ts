import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { runMiddlewareChain } from './middleware.js'
import { createAction } from './action.js'

// ---------------------------------------------------------------------------
// A-3: Middleware chain composition
// ---------------------------------------------------------------------------

describe('runMiddlewareChain()', () => {
  it('returns initial ctx when no middlewares', async () => {
    const ctx = await runMiddlewareChain([], { user: 'alice' })
    expect(ctx).toEqual({ user: 'alice' })
  })

  it('executes a single middleware and returns updated ctx', async () => {
    const middleware = vi.fn(async (ctx: object) => ({ ...ctx, role: 'admin' }))

    const ctx = await runMiddlewareChain([middleware], {})
    expect(ctx).toEqual({ role: 'admin' })
    expect(middleware).toHaveBeenCalledOnce()
  })

  it('executes middlewares in order', async () => {
    const order: number[] = []

    const mw1 = async (ctx: object) => { order.push(1); return { ...ctx, step1: true } }
    const mw2 = async (ctx: object) => { order.push(2); return { ...ctx, step2: true } }
    const mw3 = async (ctx: object) => { order.push(3); return { ...ctx, step3: true } }

    const ctx = await runMiddlewareChain([mw1, mw2, mw3], {})
    expect(order).toEqual([1, 2, 3])
    expect(ctx).toEqual({ step1: true, step2: true, step3: true })
  })

  it('each middleware receives ctx from the previous layer', async () => {
    const seenCtx: object[] = []

    const mw1 = async (_ctx: object) => ({ user: 'alice' })
    const mw2 = async (ctx: object) => { seenCtx.push(ctx); return { ...ctx, role: 'admin' } }
    const mw3 = async (ctx: object) => { seenCtx.push(ctx); return ctx }

    await runMiddlewareChain([mw1, mw2, mw3], {})
    expect(seenCtx[0]).toEqual({ user: 'alice' })
    expect(seenCtx[1]).toEqual({ user: 'alice', role: 'admin' })
  })

  it('propagates errors thrown inside middleware', async () => {
    const mw = async (_ctx: object) => { throw new Error('Unauthorized') }

    await expect(runMiddlewareChain([mw], {})).rejects.toThrow('Unauthorized')
  })

  it('stops chain execution when middleware throws', async () => {
    const mw2 = vi.fn()
    const mw1 = async (_ctx: object) => { throw new Error('Forbidden') }

    await expect(runMiddlewareChain([mw1, mw2], {})).rejects.toThrow('Forbidden')
    expect(mw2).not.toHaveBeenCalled()
  })

  it('works end-to-end with createAction middlewares', async () => {
    const schema = z.object({ name: z.string() })

    const action = createAction()
      .use(async (ctx) => ({ ...ctx, user: 'alice' }))
      .use(async (ctx) => ({ ...ctx, role: 'admin' }))
      .create({ schema }, async (_data, ctx) => ({
        success: true as const,
        data: ctx,
      }))

    const finalCtx = await runMiddlewareChain(action._middlewares, {})
    expect(finalCtx).toEqual({ user: 'alice', role: 'admin' })
  })
})

// ---------------------------------------------------------------------------
// A-6, A-7, A-8: Handler return shapes
// ---------------------------------------------------------------------------

describe('handler return shapes', () => {
  const schema = z.object({ name: z.string() })

  it('A-6: handler can return fieldErrors', async () => {
    const action = createAction().create({ schema }, async (_data, _ctx) => ({
      success: false as const,
      fieldErrors: { name: ['Name is already taken'] },
    }))

    const result = await action._handler({ name: 'alice' }, {})
    expect(result).toEqual({
      success: false,
      fieldErrors: { name: ['Name is already taken'] },
    })
  })

  it('A-6: handler can return multiple field errors per field', async () => {
    const action = createAction().create({ schema }, async (_data, _ctx) => ({
      success: false as const,
      fieldErrors: { name: ['Too short', 'Already taken'] },
    }))

    const result = await action._handler({ name: 'al' }, {})
    expect(result).toEqual({
      success: false,
      fieldErrors: { name: ['Too short', 'Already taken'] },
    })
  })

  it('A-7: handler can return a global error', async () => {
    const action = createAction().create({ schema }, async (_data, _ctx) => ({
      success: false as const,
      error: 'Something went wrong',
    }))

    const result = await action._handler({ name: 'alice' }, {})
    expect(result).toEqual({ success: false, error: 'Something went wrong' })
  })

  it('A-8: handler can return typed success data', async () => {
    const action = createAction().create({ schema }, async (data, _ctx) => ({
      success: true as const,
      data: { id: '123', name: data.name },
    }))

    const result = await action._handler({ name: 'alice' }, {})
    expect(result).toEqual({ success: true, data: { id: '123', name: 'alice' } })
  })

  it('A-8: handler can return success with no data', async () => {
    const action = createAction().create({ schema }, async (_data, _ctx) => ({
      success: true as const,
    }))

    const result = await action._handler({ name: 'alice' }, {})
    expect(result).toEqual({ success: true })
  })

  it('S-1: single-step z.object schema passes through to handler', async () => {
    const fullSchema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number(),
    })

    const received: z.output<typeof fullSchema>[] = []
    const action = createAction().create({ schema: fullSchema }, async (data, _ctx) => {
      received.push(data)
      return { success: true as const }
    })

    await action._handler({ firstName: 'John', lastName: 'Doe', age: 30 }, {})
    expect(received[0]).toEqual({ firstName: 'John', lastName: 'Doe', age: 30 })
  })

  it('S-6: payload schema is stored and passed to handler separately', async () => {
    const payload = z.object({ facilityId: z.string(), isAdmin: z.boolean() })
    const received: { data: unknown; payload: unknown }[] = []

    const action = createAction().create(
      { schema, payload },
      async (data, p, _ctx) => {
        received.push({ data, payload: p })
        return { success: true as const }
      },
    )

    expect(action._payload).toBe(payload)
    await action._handler({ name: 'alice' }, { facilityId: 'fac-1', isAdmin: true }, {})
    expect(received[0]).toEqual({
      data: { name: 'alice' },
      payload: { facilityId: 'fac-1', isAdmin: true },
    })
  })
})
