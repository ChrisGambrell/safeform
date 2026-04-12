import { describe, it } from 'vitest'
import { z } from 'zod'
import type { ZodPaths, ZodPathValue, ArrayPaths, ArrayItemValue } from './paths.js'

// ---------------------------------------------------------------------------
// T-7: Deep keypath type utility
//
// All assertions are compile-time only. If the type resolves incorrectly, the
// local variable assignment will produce a TypeScript error and the test
// (tsc build / vitest type-check) fails. There is no runtime assertion needed.
// ---------------------------------------------------------------------------

describe('ZodPaths — T-7', () => {
  it('resolves top-level keys of a flat object schema', () => {
    const _schema = z.object({ name: z.string(), age: z.number() })
    type Paths = ZodPaths<typeof _schema>

    const _name: 'name' extends Paths ? true : false = true
    const _age: 'age' extends Paths ? true : false = true
    void _name
    void _age
  })

  it('resolves nested object paths via dot-notation', () => {
    const _schema = z.object({
      address: z.object({ city: z.string(), zip: z.string() }),
    })
    type Paths = ZodPaths<typeof _schema>

    const _top: 'address' extends Paths ? true : false = true
    const _city: 'address.city' extends Paths ? true : false = true
    const _zip: 'address.zip' extends Paths ? true : false = true
    void _top
    void _city
    void _zip
  })

  it('resolves array fields to both the field key and numeric index paths', () => {
    const _schema = z.object({ tags: z.array(z.string()) })
    type Paths = ZodPaths<typeof _schema>

    const _field: 'tags' extends Paths ? true : false = true
    const _index: `tags.${number}` extends Paths ? true : false = true
    void _field
    void _index
  })

  it('does not include keys that are not in the schema', () => {
    const _schema = z.object({ name: z.string() })
    type Paths = ZodPaths<typeof _schema>

    const _absent: 'age' extends Paths ? false : true = true
    void _absent
  })

  it('handles deeply nested objects (3 levels)', () => {
    const _schema = z.object({
      a: z.object({ b: z.object({ c: z.string() }) }),
    })
    type Paths = ZodPaths<typeof _schema>

    const _top: 'a' extends Paths ? true : false = true
    const _mid: 'a.b' extends Paths ? true : false = true
    const _deep: 'a.b.c' extends Paths ? true : false = true
    void _top
    void _mid
    void _deep
  })
})

// ---------------------------------------------------------------------------

describe('ZodPathValue — T-7', () => {
  it('resolves a top-level string field', () => {
    const _schema = z.object({ name: z.string() })
    type Val = ZodPathValue<typeof _schema, 'name'>

    const _check: Val extends string ? true : false = true
    void _check
  })

  it('resolves a top-level number field', () => {
    const _schema = z.object({ count: z.number() })
    type Val = ZodPathValue<typeof _schema, 'count'>

    const _check: Val extends number ? true : false = true
    void _check
  })

  it('resolves a nested dot-notation path', () => {
    const _schema = z.object({ address: z.object({ city: z.string() }) })
    type Val = ZodPathValue<typeof _schema, 'address.city'>

    const _check: Val extends string ? true : false = true
    void _check
  })

  it('resolves an array index path to the item type', () => {
    const _schema = z.object({ tags: z.array(z.string()) })
    type Val = ZodPathValue<typeof _schema, `tags.${number}`>

    const _check: Val extends string ? true : false = true
    void _check
  })

  it('resolves to never for a non-existent path', () => {
    const _schema = z.object({ name: z.string() })
    type Val = ZodPathValue<typeof _schema, 'missing'>

    const _check: [Val] extends [never] ? true : false = true
    void _check
  })
})

// ---------------------------------------------------------------------------

describe('ArrayPaths — T-7', () => {
  it('includes only array fields', () => {
    const _schema = z.object({ name: z.string(), tags: z.array(z.string()) })
    type AP = ArrayPaths<typeof _schema>

    const _tags: 'tags' extends AP ? true : false = true
    const _name: 'name' extends AP ? false : true = true
    void _tags
    void _name
  })

  it('resolves to never for a schema with no arrays', () => {
    const _schema = z.object({ name: z.string(), age: z.number() })
    type AP = ArrayPaths<typeof _schema>

    const _never: [AP] extends [never] ? true : false = true
    void _never
  })

  it('includes multiple array fields', () => {
    const _schema = z.object({
      tags: z.array(z.string()),
      roles: z.array(z.string()),
      name: z.string(),
    })
    type AP = ArrayPaths<typeof _schema>

    const _tags: 'tags' extends AP ? true : false = true
    const _roles: 'roles' extends AP ? true : false = true
    const _name: 'name' extends AP ? false : true = true
    void _tags
    void _roles
    void _name
  })
})

// ---------------------------------------------------------------------------

describe('ArrayItemValue — T-7', () => {
  it('resolves the item type for a string array field', () => {
    const _schema = z.object({ tags: z.array(z.string()) })
    type Item = ArrayItemValue<typeof _schema, 'tags'>

    const _check: Item extends string ? true : false = true
    void _check
  })

  it('resolves the item type for an object array field', () => {
    const _schema = z.object({
      items: z.array(z.object({ id: z.number(), label: z.string() })),
    })
    type Item = ArrayItemValue<typeof _schema, 'items'>

    const _id: 'id' extends keyof Item ? true : false = true
    const _label: 'label' extends keyof Item ? true : false = true
    void _id
    void _label
  })

  it('resolves to never for a non-array field', () => {
    const _schema = z.object({ name: z.string() })
    type Item = ArrayItemValue<typeof _schema, 'name'>

    const _never: [Item] extends [never] ? true : false = true
    void _never
  })

  it('resolves to never for a non-existent field', () => {
    const _schema = z.object({ tags: z.array(z.string()) })
    type Item = ArrayItemValue<typeof _schema, 'missing'>

    const _never: [Item] extends [never] ? true : false = true
    void _never
  })
})
