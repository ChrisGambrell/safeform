# @safeform/core

End-to-end type-safe forms for React. Define your schema once — get typed validation on the server, typed state on the client, and zero glue code in between.

```bash
npm install @safeform/core @safeform/next
```

> **Peer dependencies:** React 18+, Zod 3+, react-hook-form 7+

---

## Quick Start

### 1. Create your base action builders

```ts
// lib/actions.ts
import { createAction } from '@safeform/core'
import { getSession } from '@/lib/auth'

export const publicAction = createAction()

export const authedAction = createAction().use(async (next) => {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return next({ user: session.user })
})
```

### 2. Define your schema

The schema lives in a `schema.ts` file colocated with the route — safe to import on both client and server.

```ts
// app/api/employees/schema.ts
import { z } from 'zod'

export const upsertEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['Admin', 'Cashier', 'Janitor']),
  ssn: z.string().length(9),
})
```

### 3. Define your action and mount the route handler

```ts
// app/api/employees/route.ts
import { createRouteHandler } from '@safeform/next'
import { authedAction } from '@/lib/actions'
import { upsertEmployeeSchema } from './schema'
import { z } from 'zod'

const upsertEmployeeAction = authedAction.create({
  schema: upsertEmployeeSchema,
  payload: z.object({ employeeId: z.string().cuid().optional() }),
}, async (data, payload, ctx) => {
  // data    → typed from upsertEmployeeSchema
  // payload → typed from payload schema
  // ctx     → { user: Session['user'] }

  const employee = await db.employee.upsert({ ... })
  return { success: true as const, data: { employeeId: employee.id } }
})

export type UpsertEmployeeAction = typeof upsertEmployeeAction
export const POST = createRouteHandler(upsertEmployeeAction)
```

### 4. Use the form on the client

```tsx
'use client'
import { useForm, FormField, SafeFormContext } from '@safeform/core'
import { upsertEmployeeSchema } from '@/app/api/employees/schema'
import type { UpsertEmployeeAction } from '@/app/api/employees/route'

export function EmployeeForm({ employee }: { employee?: Employee }) {
  const { handleSubmit, state, _ctx } = useForm<UpsertEmployeeAction>({
    endpoint: '/api/employees',
    schema: upsertEmployeeSchema,
    payload: { employeeId: employee?.id },
    onSuccess: (data) => console.log('saved', data.employeeId),
    onError: (error) => console.error(error),
  })

  return (
    <SafeFormContext.Provider value={_ctx}>
      <form onSubmit={handleSubmit} noValidate>
        <FormField name="firstName">
          {({ value, onChange, onBlur, errors }) => (
            <div>
              <input value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} />
              {errors?.map(e => <p key={e}>{e}</p>)}
            </div>
          )}
        </FormField>

        <button type="submit" disabled={state.isPending}>
          {state.isPending ? 'Saving...' : 'Save'}
        </button>
      </form>
    </SafeFormContext.Provider>
  )
}
```

---

## Multi-Step Forms

### Unnamed — flat merge

```ts
import { z } from 'zod'

export const onboardingSchema = z.tuple([
  z.object({ firstName: z.string().min(1), lastName: z.string().min(1) }),
  z.object({ address: z.string().min(1), city: z.string().min(1) }),
])
```

```ts
export const onboardingAction = authedAction.create({
  schema: onboardingSchema,
}, async (data, ctx) => {
  // data is flattened: { firstName, lastName, address, city }
  return { success: true as const }
})
```

### Named — namespaced per step

```ts
import { createSteps } from '@safeform/core'

export const intakeSchema = createSteps({
  vitals: z.object({ heartRate: z.number(), bloodPressure: z.string() }),
  personal: z.object({ firstName: z.string().min(1), lastName: z.string().min(1) }),
})
```

```ts
export const intakeAction = authedAction.create({
  schema: intakeSchema,
}, async (data, ctx) => {
  data.vitals.heartRate     // number
  data.personal.firstName   // string
  return { success: true as const }
})
```

```tsx
const { handleSubmit, state, _ctx, step, totalSteps, next, prev, isFirstStep, isLastStep } =
  useForm<OnboardingAction>({
    endpoint: '/api/onboarding',
    schema: onboardingSchema,
  })

return (
  <SafeFormContext.Provider value={_ctx}>
    <form onSubmit={handleSubmit} noValidate>
      {step === 0 && <FormField name="firstName">{...}</FormField>}
      {step === 1 && <FormField name="address">{...}</FormField>}

      <div>
        {!isFirstStep && <button type="button" onClick={prev}>Back</button>}
        {!isLastStep  && <button type="button" onClick={next}>Next</button>}
        {isLastStep   && <button type="submit">Submit</button>}
      </div>
    </form>
  </SafeFormContext.Provider>
)
```

`next()` validates the current step client-side before advancing.

---

## Arrays and Nested Objects

```tsx
const schema = z.object({
  address: z.object({ city: z.string(), zip: z.string() }),
  tags: z.array(z.string()),
})

// Nested — dot notation
<FormField name="address.city">
  {({ value, onChange }) => <input value={value} onChange={e => onChange(e.target.value)} />}
</FormField>

// Arrays
<FormArray name="tags">
  {({ items, append, remove }) => (
    <>
      {items.map((_, i) => (
        <FormField key={i} name={`tags.${i}`}>
          {({ value, onChange }) => (
            <div>
              <input value={value} onChange={e => onChange(e.target.value)} />
              <button type="button" onClick={() => remove(i)}>Remove</button>
            </div>
          )}
        </FormField>
      ))}
      <button type="button" onClick={() => append('')}>Add</button>
    </>
  )}
</FormArray>
```

---

## Middleware

```ts
export const authedAction = createAction().use(async (next) => {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return next({ user: session.user })
})

export const adminAction = authedAction.use(async (next, ctx) => {
  if (ctx.user.role !== 'Admin') throw new Error('Forbidden')
  return next(ctx)
})
```

Stack as many layers as needed — each layer extends the context type.

---

## State Reference

```ts
{
  fieldErrors: Record<string, string[]>  // per-field errors from server
  error: string | null                   // global error string
  data: TData | null                     // typed server return value
  isPending: boolean                     // fetch in-flight
}
```

---

## Security

The `payload` option passes non-editable data alongside a form (e.g. `facilityId`, record IDs). This data is sent from the client — **always re-authorize payload values in your handler:**

```ts
async (data, payload, ctx) => {
  const access = await db.facilityUser.findFirst({
    where: { facilityId: payload.facilityId, userId: ctx.user.id },
  })
  if (!access) throw new Error('Forbidden')
}
```

---

## Framework Adapters

| Package | Framework |
|---|---|
| [`@safeform/next`](https://npmjs.com/package/@safeform/next) | Next.js App Router |

---

## License

MIT
