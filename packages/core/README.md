# @safeform/core

End-to-end type-safe forms for React. Define your schema once — get typed validation on the server, typed state on the client, and zero glue code in between.

```bash
npm install @safeform/core @safeform/next
```

> **Peer dependencies:** React 18+, Zod 3+, react-hook-form 7+

---

## Table of Contents

- [Quick Start](#quick-start)
- [Multi-Step Forms](#multi-step-forms)
- [Arrays and Nested Objects](#arrays-and-nested-objects)
- [Bringing Your Own UI](#bringing-your-own-ui)
- [Masked Inputs](#masked-inputs)
- [Middleware](#middleware)
- [State Reference](#state-reference)
- [Security](#security)
- [Framework Adapters](#framework-adapters)
- [License](#license)

---

## Quick Start

### 1. Create your base action builders

```ts
// lib/actions.ts
import { createAction } from '@safeform/core'
import { getSession } from '@/lib/auth'

export const publicAction = createAction()

export const authedAction = createAction().use(async (ctx) => {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return { ...ctx, user: session.user }
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
  const { formProps, state, _ctx } = useForm<UpsertEmployeeAction>({
    endpoint: '/api/employees',
    schema: upsertEmployeeSchema,
    payload: { employeeId: employee?.id },
    onSuccess: (data) => console.log('saved', data.employeeId),
    onError: (error) => console.error(error),
  })

  return (
    <SafeFormContext.Provider value={_ctx}>
      <form {...formProps}>
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
const { formProps, state, _ctx, step, totalSteps, next, prev, isFirstStep, isLastStep } =
  useForm<OnboardingAction>({
    endpoint: '/api/onboarding',
    schema: onboardingSchema,
  })

return (
  <SafeFormContext.Provider value={_ctx}>
    <form {...formProps}>
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

## Bringing Your Own UI

Build reusable field components once. `SafeFormContext.Provider` goes outside the `<form>` so every field inside can read from it. Pass `_ctx` to each field component — TypeScript infers valid `name` values from the schema automatically.

```tsx
// components/fields/text-field.tsx
import { FormField } from '@safeform/core'
import type { Action, TypedCtx, FieldName } from '@safeform/core'

interface TextFieldProps<TAction extends Action<any, any, any, any>> {
  ctx: TypedCtx<TAction>   // binds this field to a specific form's schema
  name: FieldName<TAction> // inferred — only valid field names are accepted
  label: string
  placeholder?: string
}

export function TextField<TAction extends Action<any, any, any, any>>({
  ctx: _ctx, // received for type inference; context is provided by the outer Provider
  name,
  label,
  placeholder,
}: TextFieldProps<TAction>) {
  return (
    <FormField name={name}>
      {({ value, onChange, onBlur, errors }) => (
        <div>
          <label htmlFor={name}>{label}</label>
          <input
            id={name}
            value={value as string}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
          />
          {errors?.map(err => <p key={err}>{err}</p>)}
        </div>
      )}
    </FormField>
  )
}
```

Spread `formProps` onto `<form>` and place the `Provider` outside it:

```tsx
const { _ctx, formProps, state } = useForm<UpsertEmployeeAction>({ ... })

<SafeFormContext.Provider value={_ctx}>
  <form {...formProps}>   {/* spreads onSubmit + noValidate */}
    <TextField ctx={_ctx} name="firstName" label="First Name" />
    <TextField ctx={_ctx} name="lastName" label="Last Name" />
    {/* TypeScript error: name="ssnn" — not a valid field */}
    <button type="submit" disabled={state.isPending}>Save</button>
  </form>
</SafeFormContext.Provider>
```

---

## Masked Inputs

`useMask` is a standalone hook that manages mask state and returns props you can spread onto any input — native, shadcn, Radix, or otherwise. No form context required.

### Tokens

| Token | Matches |
|-------|---------|
| `#` | Digit (0–9) |
| `$` | Letter (a–z, A–Z) |
| `*` | Any non-whitespace |

Everything else in the pattern is a **literal** — auto-inserted and never typed by the user.

### Built-in masks

| Name | Pattern |
|------|---------|
| `phone` | `(###) ###-####` |
| `ssn` | `###-##-####` |
| `date` | `##/##/####` |
| `dateTime` | `##/##/#### ##:##` |
| `time` | `##:##` |
| `creditCard` | `#### #### #### ####` |
| `cvv` | `###` |
| `cvv4` | `####` |
| `ein` | `##-#######` |
| `postalCode` | `#####` |
| `postalCodeFull` | `#####-####` |

### Basic usage

```tsx
import { useMask } from '@safeform/core'

const { rawValue, ...maskProps } = useMask('phone')

<input {...maskProps} />
```

`maskProps` includes `value` (formatted display), `onChange`, `onKeyDown`, `placeholder`, and `maxLength` — spread it onto the input. Use `rawValue` when you need just the digits/letters with no literals (e.g. to pass to an action).

```tsx
// Phone: value = "(555) 123-4567", rawValue = "5551234567"
// SSN:   value = "123-45-6789",    rawValue = "123456789"
// Date:  value = "01/15/1990",     rawValue = "01151990"
await myAction({ phone: rawValue })
```

### With any UI library

```tsx
// shadcn
import { Input } from '@/components/ui/input'
const maskProps = useMask('date')
<Input {...maskProps} />

// Radix or anything else
const maskProps = useMask('ssn')
<MyCustomInput {...maskProps} />
```

### Custom pattern

```tsx
const maskProps = useMask('$$-###-$$$$')
<input {...maskProps} />
```

### Zod validation

Use `MASK_SCHEMAS` for one-liner validation that matches the mask exactly, or `maskToZod` when you need a custom error message or a custom pattern.

```ts
import { MASK_SCHEMAS, maskToZod } from '@safeform/core'

const schema = z.object({
  // Pre-built schema with default error message
  phone: MASK_SCHEMAS.phone,
  dob:   MASK_SCHEMAS.date,
  ssn:   MASK_SCHEMAS.ssn,

  // Custom error message
  mobile: maskToZod('phone', 'Enter a valid mobile number'),

  // Custom pattern
  pin: maskToZod('####', 'PIN must be 4 digits'),
})
```

---

## Middleware

```ts
export const authedAction = createAction().use(async (ctx) => {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return { ...ctx, user: session.user }
})

export const adminAction = authedAction.use(async (ctx) => {
  if (ctx.user.role !== 'Admin') throw new Error('Forbidden')
  return ctx
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
