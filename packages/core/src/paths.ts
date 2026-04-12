import type { z } from 'zod'

// ---------------------------------------------------------------------------
// Unwrap Zod wrappers (optional, nullable, default)
// ---------------------------------------------------------------------------

type UnwrapZod<T extends z.ZodTypeAny> = T extends z.ZodOptional<infer U>
  ? UnwrapZod<U>
  : T extends z.ZodNullable<infer U>
    ? UnwrapZod<U>
    : T extends z.ZodDefault<infer U>
      ? UnwrapZod<U>
      : T

// ---------------------------------------------------------------------------
// ZodPaths — all valid dot-notation field paths for a Zod schema
//
// Given z.object({ name: z.string(), address: z.object({ city: z.string() }) })
// resolves to: "name" | "address" | "address.city"
//
// Given z.object({ tags: z.array(z.string()) })
// resolves to: "tags" | `tags.${number}`
// ---------------------------------------------------------------------------

export type ZodPaths<T extends z.ZodTypeAny> =
  UnwrapZod<T> extends z.ZodObject<infer S>
    ? {
        [K in keyof S & string]: UnwrapZod<S[K] & z.ZodTypeAny> extends z.ZodObject<any>
          ? K | `${K}.${ZodPaths<UnwrapZod<S[K] & z.ZodTypeAny>>}`
          : UnwrapZod<S[K] & z.ZodTypeAny> extends z.ZodArray<any>
            ? K | `${K}.${number}`
            : K
      }[keyof S & string]
    : never

// ---------------------------------------------------------------------------
// ZodPathValue — the output type at a given dot-notation path
//
// ZodPathValue<typeof schema, "address.city"> → string
// ZodPathValue<typeof schema, "tags.0"> → string
// ---------------------------------------------------------------------------

export type ZodPathValue<T extends z.ZodTypeAny, P extends string> =
  UnwrapZod<T> extends z.ZodObject<infer S>
    ? P extends `${infer Head}.${infer Tail}`
      ? Head extends keyof S
        ? ZodPathValue<UnwrapZod<S[Head] & z.ZodTypeAny>, Tail>
        : never
      : P extends keyof S
        ? z.output<S[P] & z.ZodTypeAny>
        : never
    : UnwrapZod<T> extends z.ZodArray<infer Item extends z.ZodTypeAny>
      ? z.output<Item>
      : never

// ---------------------------------------------------------------------------
// ArrayPaths — paths that point to array fields (for FormArray)
// ---------------------------------------------------------------------------

export type ArrayPaths<T extends z.ZodTypeAny> =
  UnwrapZod<T> extends z.ZodObject<infer S>
    ? {
        [K in keyof S & string]: UnwrapZod<S[K] & z.ZodTypeAny> extends z.ZodArray<any>
          ? K
          : never
      }[keyof S & string]
    : never

// ---------------------------------------------------------------------------
// ArrayItemValue — the element type of an array field
// ---------------------------------------------------------------------------

export type ArrayItemValue<T extends z.ZodTypeAny, P extends string> =
  UnwrapZod<T> extends z.ZodObject<infer S>
    ? P extends keyof S
      ? UnwrapZod<S[P] & z.ZodTypeAny> extends z.ZodArray<infer Item extends z.ZodTypeAny>
        ? z.output<Item>
        : never
      : never
    : never
