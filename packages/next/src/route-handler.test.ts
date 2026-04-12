import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { createAction, createSteps } from '@safeform/core'
import { createRouteHandler, ERRORS } from './route-handler.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function callHandler(
  action: Parameters<typeof createRouteHandler>[0],
  body: unknown,
): Promise<{ status: number; body: unknown }> {
  const handler = createRouteHandler(action)
  const response = await handler(makeRequest(body))
  return { status: response.status, body: await response.json() }
}

const schema = z.object({ name: z.string(), age: z.number() })

// ---------------------------------------------------------------------------
// R-1: createRouteHandler mounts an action as a POST handler
// ---------------------------------------------------------------------------

describe('createRouteHandler() — R-1', () => {
  it('returns a function', () => {
    const action = createAction().create({ schema }, (_data, _ctx) => ({
      success: true as const,
    }))
    const handler = createRouteHandler(action)
    expect(typeof handler).toBe('function')
  })

  it('returns a Response when called', async () => {
    const action = createAction().create({ schema }, (_data, _ctx) => ({
      success: true as const,
    }))
    const handler = createRouteHandler(action)
    const response = await handler(makeRequest({ data: { name: 'Alice', age: 30 } }))
    expect(response).toBeInstanceOf(Response)
  })
})

// ---------------------------------------------------------------------------
// R-2: JSON body parsing
// ---------------------------------------------------------------------------

describe('JSON body parsing — R-2', () => {
  it('returns 400 with error message on invalid JSON', async () => {
    const action = createAction().create({ schema }, (_data, _ctx) => ({
      success: true as const,
    }))
    const handler = createRouteHandler(action)
    const response = await handler(
      new Request('http://localhost/api/test', {
        method: 'POST',
        body: 'not valid json',
      }),
    )
    expect(response.status).toBe(400)
    const body = await response.json() as { error: string }
    expect(body.error).toBe(ERRORS.INVALID_JSON)
  })

  it('returns 400 when body is not an object', async () => {
    const action = createAction().create({ schema }, (_data, _ctx) => ({
      success: true as const,
    }))
    const { status } = await callHandler(action, 'just a string')
    expect(status).toBe(400)
  })

  it('passes parsed data to the handler', async () => {
    const received: unknown[] = []
    const action = createAction().create({ schema }, (data, _ctx) => {
      received.push(data)
      return { success: true as const }
    })

    await callHandler(action, { data: { name: 'Alice', age: 30 } })
    expect(received[0]).toEqual({ name: 'Alice', age: 30 })
  })

  it('passes parsed payload to the handler when payload schema provided', async () => {
    const payload = z.object({ facilityId: z.string() })
    const received: unknown[] = []

    const action = createAction().create({ schema, payload }, (data, p, _ctx) => {
      received.push({ data, payload: p })
      return { success: true as const }
    })

    await callHandler(action, {
      data: { name: 'Alice', age: 30 },
      payload: { facilityId: 'fac-1' },
    })

    expect(received[0]).toEqual({
      data: { name: 'Alice', age: 30 },
      payload: { facilityId: 'fac-1' },
    })
  })

  it('returns 200 with success data on valid request', async () => {
    const action = createAction().create({ schema }, (data, _ctx) => ({
      success: true as const,
      data: { greeting: `Hello ${data.name}` },
    }))

    const { status, body } = await callHandler(action, { data: { name: 'Alice', age: 30 } })
    expect(status).toBe(200)
    expect(body).toEqual({ success: true, data: { greeting: 'Hello Alice' } })
  })

  it('returns 422 with fieldErrors on schema validation failure', async () => {
    const action = createAction().create({ schema }, (_data, _ctx) => ({
      success: true as const,
    }))

    const { status, body } = await callHandler(action, { data: { name: 123, age: 'not a number' } })
    expect(status).toBe(422)
    const b = body as { success: boolean; fieldErrors: Record<string, string[]> }
    expect(b.success).toBe(false)
    expect(b.fieldErrors).toBeDefined()
  })

  it('returns 422 with fieldErrors returned by the handler', async () => {
    const action = createAction().create({ schema }, (_data, _ctx) => ({
      success: false as const,
      fieldErrors: { name: ['Name already taken'] },
    }))

    const { status, body } = await callHandler(action, { data: { name: 'Alice', age: 30 } })
    expect(status).toBe(422)
    const b = body as { fieldErrors: Record<string, string[]> }
    expect(b.fieldErrors).toEqual({ name: ['Name already taken'] })
  })

  it('returns 400 with error on handler global error', async () => {
    const action = createAction().create({ schema }, (_data, _ctx) => ({
      success: false as const,
      error: 'Something went wrong',
    }))

    const { status, body } = await callHandler(action, { data: { name: 'Alice', age: 30 } })
    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Something went wrong')
  })

  it('returns 401 when middleware throws Unauthorized', async () => {
    const action = createAction()
      .use((_next, _ctx) => {
        throw new Error('Unauthorized')
      })
      .create({ schema }, (_data, _ctx) => ({ success: true as const }))

    const { status, body } = await callHandler(action, { data: { name: 'Alice', age: 30 } })
    expect(status).toBe(401)
    expect((body as { error: string }).error).toBe(ERRORS.UNAUTHORIZED)
  })

  it('returns 403 when middleware throws Forbidden', async () => {
    const action = createAction()
      .use((_next, _ctx) => {
        throw new Error('Forbidden')
      })
      .create({ schema }, (_data, _ctx) => ({ success: true as const }))

    const { status } = await callHandler(action, { data: { name: 'Alice', age: 30 } })
    expect(status).toBe(403)
  })

  it('returns 500 when handler throws unexpectedly', async () => {
    const action = createAction().create({ schema }, (_data, _ctx) => {
      throw new Error('Database exploded')
    })

    const { status, body } = await callHandler(action, { data: { name: 'Alice', age: 30 } })
    expect(status).toBe(500)
    expect((body as { error: string }).error).toBe(ERRORS.INTERNAL)
  })

  it('does not leak error details on 500', async () => {
    const action = createAction().create({ schema }, (_data, _ctx) => {
      throw new Error('SELECT * FROM secrets')
    })

    const { body } = await callHandler(action, { data: { name: 'Alice', age: 30 } })
    expect(JSON.stringify(body)).not.toContain('secrets')
  })
})

// ---------------------------------------------------------------------------
// Multi-step: unnamed z.tuple
// ---------------------------------------------------------------------------

describe('createRouteHandler — unnamed multi-step (z.tuple)', () => {
  const tupleSchema = z.tuple([
    z.object({ firstName: z.string(), lastName: z.string() }),
    z.object({ email: z.string().email() }),
  ])

  it('flattens step data and passes merged object to handler', async () => {
    const received: unknown[] = []
    const action = createAction().create({ schema: tupleSchema }, (data, _ctx) => {
      received.push(data)
      return { success: true as const }
    })

    await callHandler(action, {
      data: [{ firstName: 'Alice', lastName: 'Smith' }, { email: 'alice@example.com' }],
    })

    expect(received[0]).toEqual({
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
    })
  })

  it('returns 422 with field errors when a step fails validation', async () => {
    const action = createAction().create({ schema: tupleSchema }, (_data, _ctx) => ({
      success: true as const,
    }))

    const { status, body } = await callHandler(action, {
      data: [{ firstName: 'Alice' }, { email: 'not-an-email' }],
    })

    expect(status).toBe(422)
    const b = body as { fieldErrors: Record<string, string[]> }
    expect(b.fieldErrors).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Multi-step: named createSteps
// ---------------------------------------------------------------------------

describe('createRouteHandler — named multi-step (createSteps)', () => {
  const namedSchema = createSteps({
    vitals: z.object({ heartRate: z.number() }),
    history: z.object({ substanceUse: z.string() }),
  })

  it('namespaces step data under step names and passes to handler', async () => {
    const received: unknown[] = []
    const action = createAction().create({ schema: namedSchema }, (data, _ctx) => {
      received.push(data)
      return { success: true as const }
    })

    await callHandler(action, {
      data: [{ heartRate: 72 }, { substanceUse: 'none' }],
    })

    expect(received[0]).toEqual({
      vitals: { heartRate: 72 },
      history: { substanceUse: 'none' },
    })
  })

  it('returns 422 when a named step fails validation', async () => {
    const action = createAction().create({ schema: namedSchema }, (_data, _ctx) => ({
      success: true as const,
    }))

    const { status, body } = await callHandler(action, {
      data: [{ heartRate: 'not a number' }, { substanceUse: 'none' }],
    })

    expect(status).toBe(422)
    const b = body as { fieldErrors: Record<string, string[]> }
    expect(Object.keys(b.fieldErrors).some((k) => k.startsWith('vitals.'))).toBe(true)
  })
})
