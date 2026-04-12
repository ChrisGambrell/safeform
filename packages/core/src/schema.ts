import { z } from 'zod'

// ---------------------------------------------------------------------------
// Brand symbol for NamedSteps runtime detection
// ---------------------------------------------------------------------------

const NAMED_STEPS_BRAND = Symbol('safeform.namedSteps')

// ---------------------------------------------------------------------------
// NamedSteps interface
// ---------------------------------------------------------------------------

export interface NamedSteps<T extends Record<string, z.ZodObject<any>>> {
  readonly _brand: typeof NAMED_STEPS_BRAND
  readonly _steps: T
}

// ---------------------------------------------------------------------------
// Type utilities
// ---------------------------------------------------------------------------

/** Extract the string keys of a ZodObject's shape */
type ZodObjectKeys<T> = T extends z.ZodObject<infer S> ? keyof S & string : never

/**
 * Recursively find field keys that appear in more than one element of a
 * ZodObject tuple. Resolves to `never` when there are no duplicates.
 */
export type DuplicateKeysInTuple<Steps extends readonly z.ZodObject<any>[]> =
  Steps extends readonly [
    infer First extends z.ZodObject<any>,
    ...infer Rest extends z.ZodObject<any>[],
  ]
    ? (ZodObjectKeys<First> & ZodObjectKeys<Rest[number]>) | DuplicateKeysInTuple<Rest>
    : never

/**
 * Find field keys that appear in more than one value of a Record of ZodObjects.
 * Resolves to `never` when there are no duplicates.
 */
export type DuplicateKeysInRecord<
  T extends Record<string, z.ZodObject<any>>,
  Keys extends string & keyof T = string & keyof T,
> = {
  [K in Keys]: ZodObjectKeys<T[K]> & ZodObjectKeys<T[Exclude<Keys, K>]>
}[Keys]

/** Merge a union of object types into a single intersection type */
type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never

/**
 * The merged output type of a ZodTuple of ZodObjects.
 * e.g. ZodTuple<[ZodObject<{a}>, ZodObject<{b}>]> → { a; b }
 */
export type MergedTupleOutput<Steps extends [z.ZodObject<any>, ...z.ZodObject<any>[]]> =
  UnionToIntersection<z.output<Steps[number]>>

/**
 * The namespaced output type of a NamedSteps.
 * e.g. NamedSteps<{ vitals: ZodObject<{hr}> }> → { vitals: { hr } }
 */
export type NamedStepsOutput<T extends NamedSteps<Record<string, z.ZodObject<any>>>> = {
  [K in keyof T['_steps']]: z.output<T['_steps'][K]>
}

// ---------------------------------------------------------------------------
// Runtime detection helpers
// ---------------------------------------------------------------------------

export function isZodTuple(schema: unknown): schema is z.ZodTuple<any> {
  return schema instanceof z.ZodTuple
}

export function isNamedSteps(
  value: unknown,
): value is NamedSteps<Record<string, z.ZodObject<any>>> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_brand' in value &&
    (value as Record<PropertyKey, unknown>)['_brand'] === NAMED_STEPS_BRAND
  )
}

// ---------------------------------------------------------------------------
// createSteps — named multi-step with compile-time collision detection
// ---------------------------------------------------------------------------

/**
 * Define named multi-step form schemas with automatic field-key collision
 * detection. TypeScript will error at compile time if any field key appears
 * in more than one step.
 *
 * The server handler receives data namespaced by step name:
 * `{ vitals: { heartRate }, history: { substanceUse } }`
 *
 * @example
 * const schema = createSteps({
 *   vitals: z.object({ heartRate: z.number(), bp: z.string() }),
 *   history: z.object({ substanceUse: z.string() }),
 * })
 */
export function createSteps<T extends Record<string, z.ZodObject<any>>>(
  steps: T,
  // Rest parameter trick: when duplicate keys exist, a required second
  // argument appears — since callers never pass it, TypeScript errors.
  ..._: [DuplicateKeysInRecord<T>] extends [never]
    ? []
    : [
        error: `Duplicate field keys found across steps: ${string & DuplicateKeysInRecord<T>}`,
      ]
): NamedSteps<T> {
  return {
    _brand: NAMED_STEPS_BRAND,
    _steps: steps,
  } as NamedSteps<T>
}

// ---------------------------------------------------------------------------
// Data merging utilities (consumed by route handler)
// ---------------------------------------------------------------------------

/**
 * Merge an array of step data objects into a single flat object.
 * Used for unnamed (z.tuple) multi-step forms.
 */
export function mergeStepData(stepResults: unknown[]): Record<string, unknown> {
  return Object.assign({}, ...stepResults) as Record<string, unknown>
}

/**
 * Namespace step data under their step names.
 * Used for named (createSteps) multi-step forms.
 */
export function namespaceStepData(
  stepResults: unknown[],
  stepNames: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (let i = 0; i < stepNames.length; i++) {
    const name = stepNames[i]
    if (name !== undefined) {
      result[name] = stepResults[i]
    }
  }
  return result
}
