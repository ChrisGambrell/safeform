import { describe, it } from 'vitest'
import { z } from 'zod'
import { createAction } from './action.js'
import { useForm } from './use-form.js'
import type { UseFormOptions } from './use-form.js'

// ---------------------------------------------------------------------------
// H-14: TypeScript error if TAction schema does not match the schema option
// H-15: TypeScript error if TAction has payload but payload option is omitted
//
// Positive cases use compile-time assignment assertions.
// Negative cases use @ts-expect-error — if the error disappears, TypeScript
// will report "Unused '@ts-expect-error' directive" and the build will fail.
// ---------------------------------------------------------------------------

// ---- Action fixtures --------------------------------------------------------

const personSchema = z.object({ name: z.string(), age: z.number() })
const emailSchema = z.object({ email: z.string() })
const payloadSchema = z.object({ id: z.string() })

const noPayloadAction = createAction().create(
  { schema: personSchema },
  async (_data) => ({ success: true as const }),
)

const withPayloadAction = createAction().create(
  { schema: personSchema, payload: payloadSchema },
  async (_data, _payload) => ({ success: true as const }),
)

type NoPayloadAction = typeof noPayloadAction
type WithPayloadAction = typeof withPayloadAction

// ---- H-14: schema must match TAction['_schema'] ----------------------------

describe('H-14: schema type enforcement', () => {
  it('accepts the correct schema (positive)', () => {
    // This assignment must compile without error.
    const _opts: UseFormOptions<
      NoPayloadAction['_schema'],
      never,
      void
    > = { endpoint: '/api/test', schema: personSchema }
    void _opts
  })

  it('rejects a mismatched schema via UseFormOptions (negative)', () => {
    const _opts: UseFormOptions<NoPayloadAction['_schema'], never, void> = {
      endpoint: '/api/test',
      // @ts-expect-error — emailSchema shape does not match personSchema
      schema: emailSchema,
    }
    void _opts
  })

  it('infers schema type from TAction in useForm call (positive)', () => {
    // When called correctly, no TS error is expected. We wrap in a function
    // so it only type-checks, never executes (no React context available).
    function _check() {
      return useForm<NoPayloadAction>({ endpoint: '/api/test', schema: personSchema })
    }
    void _check
  })

  it('errors when wrong schema is passed to useForm (negative)', () => {
    function _check() {
      // @ts-expect-error — emailSchema does not match NoPayloadAction's schema
      return useForm<NoPayloadAction>({ endpoint: '/api/test', schema: emailSchema })
    }
    void _check
  })
})

// ---- H-15: payload required when action defines a payload schema -----------

describe('H-15: payload option enforcement', () => {
  it('no-payload action — omitting payload compiles (positive)', () => {
    function _check() {
      return useForm<NoPayloadAction>({ endpoint: '/api/test', schema: personSchema })
    }
    void _check
  })

  it('no-payload action — providing payload is a type error (negative)', () => {
    function _check() {
      return useForm<NoPayloadAction>({
        endpoint: '/api/test',
        schema: personSchema,
        // @ts-expect-error — no-payload action must not receive payload
        payload: { id: '123' },
      })
    }
    void _check
  })

  it('payload action — providing correct payload compiles (positive)', () => {
    function _check() {
      return useForm<WithPayloadAction>({
        endpoint: '/api/test',
        schema: personSchema,
        payload: { id: '123' },
      })
    }
    void _check
  })

  it('payload action — omitting payload is a type error (negative)', () => {
    function _check() {
      // @ts-expect-error — WithPayloadAction requires payload to be provided
      return useForm<WithPayloadAction>({ endpoint: '/api/test', schema: personSchema })
    }
    void _check
  })
})
