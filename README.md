# safeform

End-to-end type-safe forms for React. Define your schema once — get typed validation on the server, typed state on the client, and zero glue code in between.

```bash
npm install @safeform/core @safeform/next
```

> **Peer dependencies:** React 18+, Zod 3+, react-hook-form 7+

---

## Table of Contents

- [Why safeform?](#why-safeform)
- [Quick Start](#quick-start)
- [Multi-Step Forms](#multi-step-forms)
- [Arrays and Nested Objects](#arrays-and-nested-objects)
- [Bringing Your Own UI](#bringing-your-own-ui)
- [Masked Inputs](#masked-inputs)
- [Middleware Stacking](#middleware-stacking)
- [State Reference](#state-reference)
- [Framework Adapters](#framework-adapters)
- [Security](#security)
- [Validation](#validation)
- [License](#license)

---

## Why safeform?

Most form libraries stop at the client. You get typed fields and validation, but the moment you `fetch` your API route, you're on your own. You cast the response, hope the field error keys match your schema, and write the same boilerplate for every form.

`safeform` closes the loop:

- **Server handler return type flows to your client** — `onSuccess(data)` is fully typed
- **Field errors from the server map to your fields automatically** — no manual wiring
- **Middleware system for auth** — define `authedAction` once, reuse it everywhere
- **Multi-step forms** — with per-step schema validation and type-safe collision detection
- **Headless components** — bring your own UI, plug in shadcn/Radix/anything
- **Framework-agnostic core** — works with Next.js, Express, Hono, or any fetch-compatible runtime

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

export const adminAction = authedAction.use(async (ctx) => {
  if (ctx.user.role !== 'Admin') throw new Error('Forbidden')
  return ctx
})
```

### 2. Define your schema

The schema lives in a `schema.ts` file colocated with the route. It's imported by both the route handler (server) and the form (client), so it must not import any server-only code.

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
import { db } from '@/lib/db'

const upsertEmployeeAction = authedAction.create({
  schema: upsertEmployeeSchema,
  payload: z.object({
    employeeId: z.string().cuid().optional(),  // hidden — for upsert
  }),
}, async (data, payload, ctx) => {
  // data    → typed from upsertEmployeeSchema
  // payload → typed from payload schema
  // ctx     → { user: Session['user'] }

  // Always re-authorize payload values — never trust the client
  if (payload.employeeId) {
    const owns = await db.employee.findFirst({
      where: { id: payload.employeeId, facilityId: ctx.user.facilityId },
    })
    if (!owns) throw new Error('Forbidden')
  }

  const existing = await db.ssn.findFirst({ where: { value: data.ssn } })
  if (existing) {
    return { fieldErrors: { ssn: ['SSN is already in use'] } }
  }

  const employee = await db.employee.upsert({ ... })
  return { success: true as const, data: { employeeId: employee.id } }
})

export type UpsertEmployeeAction = typeof upsertEmployeeAction
export const POST = createRouteHandler(upsertEmployeeAction)
```

### 4. Use the form on the client

```tsx
// app/employees/employee-form.tsx
'use client'
import { useForm, FormField, SafeFormContext } from '@safeform/core'
import { upsertEmployeeSchema } from '@/app/api/employees/schema'
import type { UpsertEmployeeAction } from '@/app/api/employees/route'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function EmployeeForm({ employee }: { employee?: Employee }) {
  const router = useRouter()

  const { formProps, state, _ctx } = useForm<UpsertEmployeeAction>({
    endpoint: '/api/employees',
    schema: upsertEmployeeSchema,
    payload: { employeeId: employee?.id },
    onSuccess: (data) => {
      toast.success('Employee saved')
      router.push(`/employees/${data.employeeId}`)
    },
    onError: (error) => toast.error(error),
  })

  return (
    <SafeFormContext.Provider value={_ctx}>
      <form {...formProps}>
        <FormField name="firstName">
          {({ value, onChange, onBlur, errors }) => (
            <div>
              <input value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} />
              {errors?.map(e => <p key={e} className="error">{e}</p>)}
            </div>
          )}
        </FormField>

        <FormField name="role">
          {({ value, onChange }) => (
            <select value={value} onChange={e => onChange(e.target.value)}>
              <option value="Admin">Admin</option>
              <option value="Cashier">Cashier</option>
              <option value="Janitor">Janitor</option>
            </select>
          )}
        </FormField>

        <button type="submit" disabled={state.isPending}>
          {state.isPending ? 'Saving...' : 'Save Employee'}
        </button>
      </form>
    </SafeFormContext.Provider>
  )
}
```

---

## Multi-Step Forms

`safeform` supports two multi-step modes: **unnamed** (all step data merged flat) and **named** (each step's data namespaced under a key).

### Unnamed — flat merge

```ts
// app/api/onboarding/schema.ts
import { z } from 'zod'

export const onboardingSchema = z.tuple([
  z.object({ firstName: z.string().min(1), lastName: z.string().min(1), dob: z.date() }),
  z.object({ address: z.string().min(1), city: z.string().min(1), zip: z.string().length(5) }),
  z.object({ email: z.string().email(), phone: z.string() }),
])
```

```ts
// app/api/onboarding/route.ts
import { onboardingSchema } from './schema'

const onboardingAction = authedAction.create({
  schema: onboardingSchema,
}, async (data, ctx) => {
  // data is flattened: { firstName, lastName, dob, address, city, zip, email, phone }
  await db.user.create({ data: { ...data, userId: ctx.user.id } })
  return { success: true as const }
})
```

### Named — namespaced per step

Use `createSteps` when each step has semantic meaning. The step name becomes the key in the server handler's `data` argument — no risk of the name and schema falling out of sync.

```ts
// app/api/intake/schema.ts
import { z } from 'zod'
import { createSteps } from '@safeform/core'

export const intakeSchema = createSteps({
  vitals: z.object({
    heartRate: z.number(),
    bloodPressure: z.string(),
    temperature: z.number(),
  }),
  history: z.object({
    substanceUse: z.string(),
    lastUse: z.date(),
    priorTreatment: z.boolean(),
  }),
  personal: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dob: z.date(),
  }),
})
```

```ts
// app/api/intake/route.ts
import { intakeSchema } from './schema'

const intakeAction = authedAction.create({
  schema: intakeSchema,
}, async (data, ctx) => {
  // data is namespaced:
  data.vitals.heartRate        // number
  data.history.substanceUse    // string
  data.personal.firstName      // string

  const intake = await db.intake.create({ data: { ...data.vitals, ...data.history, ...data.personal, userId: ctx.user.id } })
  return { success: true as const, data: { intakeId: intake.id } }
})
```

Both modes enforce that no field name is shared across steps — TypeScript will error if you violate this.

```tsx
// client — import FormField separately
import { useForm, FormField, SafeFormContext } from '@safeform/core'

const {
  formProps,
  state,
  _ctx,
  step,
  totalSteps,
  next,
  prev,
  isFirstStep,
  isLastStep,
} = useForm<OnboardingAction>({
  endpoint: '/api/onboarding',
  schema: onboardingSchema,
  onSuccess: () => router.push('/dashboard'),
  onError: (e) => toast.error(e),
})

return (
  <SafeFormContext.Provider value={_ctx}>
    <form {...formProps}>
      <p>Step {step + 1} of {totalSteps}</p>

      {step === 0 && (
        <>
          <FormField name="firstName">{({ value, onChange }) => <input ... />}</FormField>
          <FormField name="dob">{({ value, onChange }) => <DatePicker value={value} ... />}</FormField>
        </>
      )}

      {step === 1 && (
        <FormField name="address">{({ value, onChange }) => <input ... />}</FormField>
      )}

      {step === 2 && (
        <FormField name="email">{({ value, onChange }) => <input ... />}</FormField>
      )}

      <div>
        {!isFirstStep && <button type="button" onClick={prev}>Back</button>}
        {!isLastStep && <button type="button" onClick={next}>Next</button>}
        {isLastStep && <button type="submit">Submit</button>}
      </div>
    </form>
  </SafeFormContext.Provider>
)
```

`next()` validates the current step's schema client-side before advancing. The server only receives data on final submit.

---

## Arrays and Nested Objects

```tsx
const schema = z.object({
  name: z.string(),
  address: z.object({
    city: z.string(),
    zip: z.string(),
  }),
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
      <button type="button" onClick={() => append('')}>Add tag</button>
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        <div className="space-y-1">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            value={value as string}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            className={errors?.length ? 'border-destructive' : ''}
          />
          {errors?.map(err => (
            <p key={err} className="text-sm text-destructive">{err}</p>
          ))}
        </div>
      )}
    </FormField>
  )
}
```

In your form, spread `formProps` onto `<form>` and place the `Provider` outside it:

```tsx
export function EmployeeForm() {
  const { _ctx, formProps, state } = useForm<UpsertEmployeeAction>({ ... })

  return (
    <SafeFormContext.Provider value={_ctx}>
      <form {...formProps}>   {/* spreads onSubmit + noValidate */}
        <TextField ctx={_ctx} name="firstName" label="First Name" />
        <TextField ctx={_ctx} name="lastName" label="Last Name" />
        {/* TypeScript error: name="ssnn" — not a valid field */}

        <button type="submit" disabled={state.isPending}>Save</button>
      </form>
    </SafeFormContext.Provider>
  )
}
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

### Using with FormField

Call `useMask` at the component level, then sync `rawValue` into the form with `useEffect`. The input gets the mask's display props; `FormField` provides errors and handles validation.

```tsx
'use client'
import { useEffect } from 'react'
import { useForm, SafeFormContext, FormField, useMask } from '@safeform/core'
import type { ContactAction } from '@/app/api/contact/route'
import { contactSchema } from '@/app/api/contact/schema'

export function ContactForm() {
  const form = useForm<ContactAction>({ endpoint: '/api/contact', schema: contactSchema })

  // One useMask call per masked field — at the component level
  const phoneMask = useMask('phone')
  const dobMask   = useMask('date')

  // Sync rawValue → form state whenever the mask value changes
  useEffect(() => { form._ctx.rhf.setValue('phone', phoneMask.rawValue) }, [phoneMask.rawValue])
  useEffect(() => { form._ctx.rhf.setValue('dob',   dobMask.rawValue)   }, [dobMask.rawValue])

  return (
    <SafeFormContext.Provider value={form._ctx}>
      <form {...form.formProps}>

        <FormField name="phone">
          {({ errors }) => (
            <div>
              <label>Phone</label>
              <input
                value={phoneMask.value}
                onChange={phoneMask.onChange}
                onKeyDown={phoneMask.onKeyDown}
                placeholder={phoneMask.placeholder}
                maxLength={phoneMask.maxLength}
              />
              {errors?.map(e => <p key={e}>{e}</p>)}
            </div>
          )}
        </FormField>

        <FormField name="dob">
          {({ errors }) => (
            <div>
              <label>Date of Birth</label>
              <input
                value={dobMask.value}
                onChange={dobMask.onChange}
                onKeyDown={dobMask.onKeyDown}
                placeholder={dobMask.placeholder}
                maxLength={dobMask.maxLength}
              />
              {errors?.map(e => <p key={e}>{e}</p>)}
            </div>
          )}
        </FormField>

        <button type="submit" disabled={form.state.isPending}>Submit</button>
      </form>
    </SafeFormContext.Provider>
  )
}
```

The schema on the server should use `rawMask` so it validates the clean digits and transforms the value — no formatting characters reach your handler:

```ts
import { rawMask } from '@safeform/core'

const contactSchema = z.object({
  phone: rawMask('phone'),  // validates 10 digits, output: "5551234567"
  dob:   rawMask('date'),   // validates 8 digits, output: "01151990"
})
```

### Zod validation

Three helpers cover every case:

| Helper | Validates | Output after parse |
|--------|-----------|--------------------|
| `MASK_SCHEMAS.phone` | fully masked string `(555) 123-4567` | same string |
| `maskToZod('phone', msg?)` | fully masked string | same string |
| `rawMask('phone', msg?)` | raw or masked — strips literals | slot chars only `5551234567` |

Use `rawMask` when your action receives `rawValue` from `useMask` — it strips any accidental formatting and validates the clean digits/letters.

```ts
import { MASK_SCHEMAS, maskToZod, rawMask } from '@safeform/core'

const schema = z.object({
  // Validate a masked display value as-is
  phone: MASK_SCHEMAS.phone,           // must be "(###) ###-####"
  dob:   maskToZod('date', 'Bad date'), // custom message

  // Validate rawValue from useMask — transforms to clean slot chars
  ssn:   rawMask('ssn'),               // "123456789" after parse
  zip:   rawMask('postalCode', 'Invalid ZIP'),
  pin:   rawMask('####', 'PIN must be 4 digits'),
})
```

---

## Middleware Stacking

```ts
// Add as many layers as you need
const superAdminAction = adminAction.use(async (ctx) => {
  const isSuperAdmin = await db.user.isSuperAdmin(ctx.user.id)
  if (!isSuperAdmin) throw new Error('Forbidden')
  return { ...ctx, isSuperAdmin: true }
})

// ctx.isSuperAdmin is typed
export const dangerousAction = superAdminAction.create({ schema }, async (data, ctx) => {
  ctx.isSuperAdmin  // true — TypeScript knows
})
```

---

## State Reference

```ts
{
  fieldErrors: DeepPartial<FieldErrorMap<TSchema>>  // per-field errors from server
  error: string | null                               // global error — show in a toaster
  data: TServerReturn | null                         // typed server handler return value
  isPending: boolean                                 // fetch in-flight
}
```

---

## Framework Adapters

| Package | Framework |
|---|---|
| `@safeform/next` | Next.js App Router |
| `@safeform/next/pages` | Next.js Pages Router |
| `@safeform/express` | Express *(coming soon)* |
| `@safeform/hono` | Hono *(coming soon)* |

### Next.js App Router

```ts
import { createRouteHandler } from '@safeform/next'
export const POST = createRouteHandler(myAction)
```

### Express *(coming soon)*

```ts
import { createExpressHandler } from '@safeform/express'
router.post('/api/employees', createExpressHandler(upsertEmployeeAction))
```

---

## Security

**Important:** The `payload` option lets you pass non-editable server-bound data alongside a form (e.g. `facilityId`, `employeeId`). This data is serialized on the client and sent with the request — a malicious user can modify it.

**Always re-authorize payload values in your handler:**

```ts
const action = authedAction.create({
  schema,
  payload: z.object({ facilityId: z.string() }),
}, async (data, payload, ctx) => {
  // Never skip this check
  const access = await db.facilityUser.findFirst({
    where: { facilityId: payload.facilityId, userId: ctx.user.id },
  })
  if (!access) throw new Error('Forbidden')
  // ... proceed
})
```

---

## Validation

- **Client-side:** Zod parses on submit — instant field errors, no network round-trip
- **Server-side:** Server always re-validates, regardless of client result — never trust the client
- On-blur validation is not performed (intentional — prevents premature error display)

---

## License

MIT
