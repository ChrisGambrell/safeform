import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  createSteps,
  isZodTuple,
  isNamedSteps,
  mergeStepData,
  namespaceStepData,
} from './schema.js'
import type { DuplicateKeysInTuple, MergedTupleOutput, NamedStepsOutput } from './schema.js'

// ---------------------------------------------------------------------------
// S-2: Unnamed multi-step (z.ZodTuple) — runtime detection + data merging
// ---------------------------------------------------------------------------

describe('isZodTuple()', () => {
  it('returns true for z.tuple schemas', () => {
    const schema = z.tuple([z.object({ a: z.string() }), z.object({ b: z.number() })])
    expect(isZodTuple(schema)).toBe(true)
  })

  it('returns false for z.object schemas', () => {
    expect(isZodTuple(z.object({ a: z.string() }))).toBe(false)
  })

  it('returns false for primitives', () => {
    expect(isZodTuple(null)).toBe(false)
    expect(isZodTuple('string')).toBe(false)
    expect(isZodTuple(42)).toBe(false)
  })
})

describe('mergeStepData()', () => {
  it('merges two step objects into a flat object', () => {
    const result = mergeStepData([{ a: 'hello' }, { b: 42 }])
    expect(result).toEqual({ a: 'hello', b: 42 })
  })

  it('merges three step objects', () => {
    const result = mergeStepData([{ a: 1 }, { b: 2 }, { c: 3 }])
    expect(result).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('returns empty object for empty array', () => {
    expect(mergeStepData([])).toEqual({})
  })

  it('later steps overwrite earlier steps on same key (last-write wins)', () => {
    // This edge case is covered by the collision detection at type level,
    // but mergeStepData itself doesn't enforce uniqueness at runtime
    const result = mergeStepData([{ a: 'first' }, { a: 'second' }])
    expect(result).toEqual({ a: 'second' })
  })
})

// S-2: Type-level test — MergedTupleOutput resolves correctly
type Step1 = z.ZodObject<{ firstName: z.ZodString; lastName: z.ZodString }>
type Step2 = z.ZodObject<{ email: z.ZodString }>
type Merged = MergedTupleOutput<[Step1, Step2]>
// TypeScript will error here if the type is wrong
const _mergedCheck: Merged = { firstName: 'a', lastName: 'b', email: 'c@d.com' }
void _mergedCheck

// ---------------------------------------------------------------------------
// S-3: Named multi-step (createSteps) — runtime detection + namespacing
// ---------------------------------------------------------------------------

describe('isNamedSteps()', () => {
  it('returns true for createSteps result', () => {
    const schema = createSteps({
      step1: z.object({ a: z.string() }),
      step2: z.object({ b: z.number() }),
    })
    expect(isNamedSteps(schema)).toBe(true)
  })

  it('returns false for plain objects', () => {
    expect(isNamedSteps({ _steps: {} })).toBe(false)
  })

  it('returns false for null and primitives', () => {
    expect(isNamedSteps(null)).toBe(false)
    expect(isNamedSteps('string')).toBe(false)
  })

  it('returns false for z.object schemas', () => {
    expect(isNamedSteps(z.object({ a: z.string() }))).toBe(false)
  })
})

describe('createSteps()', () => {
  it('returns an object with _brand and _steps', () => {
    const schema = createSteps({
      vitals: z.object({ heartRate: z.number() }),
      history: z.object({ substanceUse: z.string() }),
    })
    expect(isNamedSteps(schema)).toBe(true)
    expect(schema._steps).toBeDefined()
    expect(Object.keys(schema._steps)).toEqual(['vitals', 'history'])
  })

  it('preserves the original step schemas', () => {
    const vitals = z.object({ heartRate: z.number() })
    const history = z.object({ substanceUse: z.string() })
    const schema = createSteps({ vitals, history })

    expect(schema._steps.vitals).toBe(vitals)
    expect(schema._steps.history).toBe(history)
  })

  it('preserves step order (insertion order)', () => {
    const schema = createSteps({
      step1: z.object({ a: z.string() }),
      step2: z.object({ b: z.string() }),
      step3: z.object({ c: z.string() }),
    })
    expect(Object.keys(schema._steps)).toEqual(['step1', 'step2', 'step3'])
  })
})

describe('namespaceStepData()', () => {
  it('namespaces step results under their step names', () => {
    const result = namespaceStepData(
      [{ heartRate: 72 }, { substanceUse: 'none' }],
      ['vitals', 'history'],
    )
    expect(result).toEqual({
      vitals: { heartRate: 72 },
      history: { substanceUse: 'none' },
    })
  })

  it('handles a single step', () => {
    const result = namespaceStepData([{ name: 'Alice' }], ['personal'])
    expect(result).toEqual({ personal: { name: 'Alice' } })
  })

  it('handles three steps', () => {
    const result = namespaceStepData(
      [{ a: 1 }, { b: 2 }, { c: 3 }],
      ['step1', 'step2', 'step3'],
    )
    expect(result).toEqual({ step1: { a: 1 }, step2: { b: 2 }, step3: { c: 3 } })
  })
})

// S-3: Type-level test — NamedStepsOutput resolves correctly
const _namedSchema = createSteps({
  vitals: z.object({ heartRate: z.number() }),
  history: z.object({ substanceUse: z.string() }),
})
type NamedOut = NamedStepsOutput<typeof _namedSchema>
const _namedCheck: NamedOut = { vitals: { heartRate: 72 }, history: { substanceUse: 'none' } }
void _namedCheck

// ---------------------------------------------------------------------------
// S-4: Collision detection — unnamed tuple
// ---------------------------------------------------------------------------

describe('DuplicateKeysInTuple (type-level)', () => {
  it('S-4: resolves to never when no duplicate keys', () => {
    type Steps = [z.ZodObject<{ a: z.ZodString }>, z.ZodObject<{ b: z.ZodNumber }>]
    type Dupes = DuplicateKeysInTuple<Steps>
    // If this compiles, Dupes extends never (no duplicates)
    const _check: [Dupes] extends [never] ? true : false = true
    void _check
  })

  it('S-4: resolves to the duplicate key name when keys collide', () => {
    type Steps = [
      z.ZodObject<{ name: z.ZodString; age: z.ZodNumber }>,
      z.ZodObject<{ name: z.ZodString; email: z.ZodString }>, // 'name' is a dupe
    ]
    type Dupes = DuplicateKeysInTuple<Steps>
    // Dupes should include 'name'
    const _check: 'name' extends Dupes ? true : false = true
    void _check
  })
})

// S-4: Compile-time enforcement via createSteps (named collision detection)
describe('createSteps collision detection (compile-time)', () => {
  it('S-4: no TypeScript error when keys are unique across steps', () => {
    // This must compile without error
    const schema = createSteps({
      step1: z.object({ firstName: z.string(), lastName: z.string() }),
      step2: z.object({ email: z.string(), phone: z.string() }),
      step3: z.object({ role: z.string() }),
    })
    expect(isNamedSteps(schema)).toBe(true)
  })

  it('S-4: TypeScript error when keys collide across steps', () => {
    // @ts-expect-error — 'name' appears in both step1 and step2
    createSteps({
      step1: z.object({ name: z.string(), age: z.number() }),
      step2: z.object({ name: z.string(), email: z.string() }),
    })
  })

  it('S-4: TypeScript error on three-way collision', () => {
    // @ts-expect-error — 'id' appears in multiple steps
    createSteps({
      step1: z.object({ id: z.string(), firstName: z.string() }),
      step2: z.object({ lastName: z.string() }),
      step3: z.object({ id: z.string(), email: z.string() }),
    })
  })
})
