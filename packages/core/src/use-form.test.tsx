import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { useForm } from './use-form.js'
import { createSteps } from './schema.js'

// ---------------------------------------------------------------------------
// fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetch(response: object, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(response), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const schema = z.object({ name: z.string().min(1), age: z.number() })

// Dummy action type for type inference in tests
type DummyAction = {
  _schema: typeof schema
  _payload: undefined
  _ctx: object
  _data: { id: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _middlewares: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _handler: (...args: any[]) => any
}

// ---------------------------------------------------------------------------
// H-1: useForm base
// ---------------------------------------------------------------------------

describe('useForm() — H-1', () => {
  it('returns expected shape', () => {
    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema }),
    )

    expect(typeof result.current.handleSubmit).toBe('function')
    expect(result.current.state).toEqual({
      fieldErrors: {},
      error: null,
      data: null,
      isPending: false,
    })
    expect(result.current._ctx).toBeDefined()
    expect(typeof result.current.next).toBe('function')
    expect(typeof result.current.prev).toBe('function')
  })

  it('isMultiStep is false for single-step schema', () => {
    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema }),
    )
    expect(result.current.isMultiStep).toBe(false)
    expect(result.current.totalSteps).toBe(1)
    expect(result.current.isFirstStep).toBe(true)
    expect(result.current.isLastStep).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// H-2: Client-side Zod validation on submit
// ---------------------------------------------------------------------------

describe('client-side Zod validation — H-2', () => {
  it('does not fetch when client validation fails', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema }),
    )

    await act(async () => {
      result.current.handleSubmit({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.FormEvent)
    })

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// H-3: Fetch on validation pass
// ---------------------------------------------------------------------------

describe('fetch on validation pass — H-3', () => {
  it('calls fetch with correct endpoint and body when valid', async () => {
    const fetchSpy = mockFetch({ success: true, data: { id: '1' } })

    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/employees', schema }),
    )

    // Fill in valid form values via RHF
    act(() => {
      result.current._ctx.rhf.setValue('name', 'Alice')
      result.current._ctx.rhf.setValue('age', 30)
    })

    await act(async () => {
      result.current.handleSubmit({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.FormEvent)
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/employees',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const callBody = JSON.parse((fetchSpy.mock.calls[0]![1]! as RequestInit).body as string) as unknown
    expect(callBody).toEqual({ data: { name: 'Alice', age: 30 } })
  })

  it('includes payload in request body when provided', async () => {
    const fetchSpy = mockFetch({ success: true, data: null })

    type ActionWithPayload = {
      _schema: typeof schema
      _payload: z.ZodObject<{ facilityId: z.ZodString }>
      _ctx: object
      _data: null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _middlewares: any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _handler: (...args: any[]) => any
    }

    const { result } = renderHook(() =>
      useForm<ActionWithPayload>({
        endpoint: '/api/test',
        schema,
        payload: { facilityId: 'fac-1' },
      }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('name', 'Bob')
      result.current._ctx.rhf.setValue('age', 25)
    })

    await act(async () => {
      result.current.handleSubmit({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.FormEvent)
    })

    const callBody = JSON.parse((fetchSpy.mock.calls[0]![1]! as RequestInit).body as string) as unknown
    expect(callBody).toEqual({ data: { name: 'Bob', age: 25 }, payload: { facilityId: 'fac-1' } })
  })
})

// ---------------------------------------------------------------------------
// H-4: Server field errors mapped to state
// ---------------------------------------------------------------------------

describe('server field errors — H-4', () => {
  it('maps server fieldErrors to state.fieldErrors', async () => {
    mockFetch(
      { success: false, fieldErrors: { name: ['Name already taken'] } },
      422,
    )

    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('name', 'Alice')
      result.current._ctx.rhf.setValue('age', 30)
    })

    await act(async () => {
      result.current.handleSubmit({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.FormEvent)
    })

    expect(result.current.state.fieldErrors).toEqual({ name: ['Name already taken'] })
  })

  it('clears fieldErrors on next successful submit', async () => {
    mockFetch({ success: false, fieldErrors: { name: ['Taken'] } }, 422)

    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('name', 'Alice')
      result.current._ctx.rhf.setValue('age', 30)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.state.fieldErrors).toEqual({ name: ['Taken'] })

    mockFetch({ success: true, data: { id: '2' } })

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.state.fieldErrors).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// H-5: Global error → onError callback
// ---------------------------------------------------------------------------

describe('global error — H-5', () => {
  it('calls onError with server error message', async () => {
    mockFetch({ success: false, error: 'Something went wrong' }, 400)

    const onError = vi.fn()
    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema, onError }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('name', 'Alice')
      result.current._ctx.rhf.setValue('age', 30)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })

    expect(onError).toHaveBeenCalledWith('Something went wrong')
    expect(result.current.state.error).toBe('Something went wrong')
  })

  it('calls onError on network failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))
    const onError = vi.fn()

    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema, onError }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('name', 'Alice')
      result.current._ctx.rhf.setValue('age', 30)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })

    expect(onError).toHaveBeenCalled()
    expect(result.current.state.error).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// H-6: onSuccess called with typed server return
// ---------------------------------------------------------------------------

describe('onSuccess — H-6', () => {
  it('calls onSuccess with server data and sets state.data', async () => {
    mockFetch({ success: true, data: { id: 'emp-123' } })
    const onSuccess = vi.fn()

    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema, onSuccess }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('name', 'Alice')
      result.current._ctx.rhf.setValue('age', 30)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })

    expect(onSuccess).toHaveBeenCalledWith({ id: 'emp-123' })
    expect(result.current.state.data).toEqual({ id: 'emp-123' })
  })
})

// ---------------------------------------------------------------------------
// H-7: isPending state
// ---------------------------------------------------------------------------

describe('isPending — H-7', () => {
  it('is false initially', () => {
    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema }),
    )
    expect(result.current.state.isPending).toBe(false)
  })

  it('is false after successful submit resolves', async () => {
    mockFetch({ success: true, data: null })

    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('name', 'Alice')
      result.current._ctx.rhf.setValue('age', 30)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.state.isPending).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// H-8: Multi-step detection (z.tuple)
// ---------------------------------------------------------------------------

describe('multi-step detection — H-8', () => {
  const multiSchema = z.tuple([
    z.object({ firstName: z.string().min(1), lastName: z.string().min(1) }),
    z.object({ email: z.string().email() }),
  ])

  type MultiAction = {
    _schema: typeof multiSchema
    _payload: undefined
    _ctx: object
    _data: { id: string }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _middlewares: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _handler: (...args: any[]) => any
  }

  it('detects z.tuple as multi-step', () => {
    const { result } = renderHook(() =>
      useForm<MultiAction>({ endpoint: '/api/test', schema: multiSchema }),
    )
    expect(result.current.isMultiStep).toBe(true)
    expect(result.current.totalSteps).toBe(2)
  })

  it('starts on step 0', () => {
    const { result } = renderHook(() =>
      useForm<MultiAction>({ endpoint: '/api/test', schema: multiSchema }),
    )
    expect(result.current.step).toBe(0)
    expect(result.current.isFirstStep).toBe(true)
    expect(result.current.isLastStep).toBe(false)
  })

  it('next() advances to step 1 when step 0 is valid', async () => {
    const { result } = renderHook(() =>
      useForm<MultiAction>({ endpoint: '/api/test', schema: multiSchema }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('firstName', 'Alice')
      result.current._ctx.rhf.setValue('lastName', 'Smith')
    })

    await act(async () => {
      await result.current.next()
    })

    expect(result.current.step).toBe(1)
    expect(result.current.isFirstStep).toBe(false)
    expect(result.current.isLastStep).toBe(true)
  })

  it('next() does not advance when current step is invalid', async () => {
    const { result } = renderHook(() =>
      useForm<MultiAction>({ endpoint: '/api/test', schema: multiSchema }),
    )

    // Leave fields empty (invalid)
    await act(async () => {
      await result.current.next()
    })

    expect(result.current.step).toBe(0)
  })

  it('prev() goes back to step 0 from step 1', async () => {
    const { result } = renderHook(() =>
      useForm<MultiAction>({ endpoint: '/api/test', schema: multiSchema }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('firstName', 'Alice')
      result.current._ctx.rhf.setValue('lastName', 'Smith')
    })

    await act(async () => { await result.current.next() })
    expect(result.current.step).toBe(1)

    act(() => { result.current.prev() })
    expect(result.current.step).toBe(0)
  })

  it('prev() is a no-op on step 0', () => {
    const { result } = renderHook(() =>
      useForm<MultiAction>({ endpoint: '/api/test', schema: multiSchema }),
    )

    act(() => { result.current.prev() })
    expect(result.current.step).toBe(0)
  })

  it('final step submit sends all accumulated step data as array', async () => {
    const fetchSpy = mockFetch({ success: true, data: { id: 'new-1' } })

    const { result } = renderHook(() =>
      useForm<MultiAction>({ endpoint: '/api/test', schema: multiSchema }),
    )

    // Fill step 1
    act(() => {
      result.current._ctx.rhf.setValue('firstName', 'Alice')
      result.current._ctx.rhf.setValue('lastName', 'Smith')
    })
    await act(async () => { await result.current.next() })

    // Fill step 2
    act(() => {
      result.current._ctx.rhf.setValue('email', 'alice@example.com')
    })

    // Submit final step
    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })

    const callBody = JSON.parse((fetchSpy.mock.calls[0]![1]! as RequestInit).body as string) as { data: unknown[] }
    expect(Array.isArray(callBody.data)).toBe(true)
    expect(callBody.data[0]).toEqual({ firstName: 'Alice', lastName: 'Smith' })
    expect(callBody.data[1]).toEqual({ email: 'alice@example.com' })
  })

  it('detects createSteps as multi-step', () => {
    const namedSchema = createSteps({
      step1: z.object({ name: z.string() }),
      step2: z.object({ email: z.string() }),
    })

    type NamedAction = {
      _schema: typeof namedSchema
      _payload: undefined
      _ctx: object
      _data: null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _middlewares: any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _handler: (...args: any[]) => any
    }

    const { result } = renderHook(() =>
      useForm<NamedAction>({ endpoint: '/api/test', schema: namedSchema }),
    )
    expect(result.current.isMultiStep).toBe(true)
    expect(result.current.totalSteps).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// H-8 (named steps): createSteps multi-step navigation
// ---------------------------------------------------------------------------

describe('named multi-step (createSteps) — H-8', () => {
  const namedSchema = createSteps({
    personal: z.object({ name: z.string().min(1) }),
    contact: z.object({ email: z.string().email() }),
  })

  type NamedAction = {
    _schema: typeof namedSchema
    _payload: undefined
    _ctx: object
    _data: { ok: true }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _middlewares: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _handler: (...args: any[]) => any
  }

  it('next() advances step when valid', async () => {
    const { result } = renderHook(() =>
      useForm<NamedAction>({ endpoint: '/api/test', schema: namedSchema }),
    )

    act(() => { result.current._ctx.rhf.setValue('name', 'Alice') })

    await act(async () => { await result.current.next() })

    expect(result.current.step).toBe(1)
  })

  it('next() does not advance when invalid', async () => {
    const { result } = renderHook(() =>
      useForm<NamedAction>({ endpoint: '/api/test', schema: namedSchema }),
    )

    // Leave name empty
    await act(async () => { await result.current.next() })

    expect(result.current.step).toBe(0)
  })

  it('prev() goes back to step 0 from step 1', async () => {
    const { result } = renderHook(() =>
      useForm<NamedAction>({ endpoint: '/api/test', schema: namedSchema }),
    )

    act(() => { result.current._ctx.rhf.setValue('name', 'Alice') })
    await act(async () => { await result.current.next() })
    expect(result.current.step).toBe(1)

    act(() => { result.current.prev() })
    expect(result.current.step).toBe(0)
  })

  it('final submit sends all step data as array', async () => {
    const fetchSpy = mockFetch({ success: true, data: { ok: true } })

    const { result } = renderHook(() =>
      useForm<NamedAction>({ endpoint: '/api/test', schema: namedSchema }),
    )

    act(() => { result.current._ctx.rhf.setValue('name', 'Alice') })
    await act(async () => { await result.current.next() })

    act(() => { result.current._ctx.rhf.setValue('email', 'alice@example.com') })

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]![1]! as RequestInit).body as string,
    ) as { data: unknown[] }

    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0]).toEqual({ name: 'Alice' })
    expect(body.data[1]).toEqual({ email: 'alice@example.com' })
  })
})

// ---------------------------------------------------------------------------
// H-4/H-5: State fields are set correctly
// ---------------------------------------------------------------------------

describe('state correctness', () => {
  it('state.error is null initially', () => {
    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema }),
    )
    expect(result.current.state.error).toBeNull()
  })

  it('state.error is set to server error message on failure', async () => {
    mockFetch({ success: false, error: 'Server is on fire' }, 500)

    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('name', 'Alice')
      result.current._ctx.rhf.setValue('age', 30)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.state.error).toBe('Server is on fire')
  })

  it('state.error is cleared on next successful submit', async () => {
    mockFetch({ success: false, error: 'Oops' }, 500)

    const { result } = renderHook(() =>
      useForm<DummyAction>({ endpoint: '/api/test', schema }),
    )

    act(() => {
      result.current._ctx.rhf.setValue('name', 'Alice')
      result.current._ctx.rhf.setValue('age', 30)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })
    expect(result.current.state.error).toBe('Oops')

    mockFetch({ success: true, data: { id: '1' } })

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.state.error).toBeNull()
  })
})
