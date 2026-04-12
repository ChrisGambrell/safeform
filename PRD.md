# safeform — Product Requirements Document

## Overview

`safeform` is an open-source TypeScript library that provides end-to-end type-safe form handling for React applications with API routes. It bridges the gap between Zod-validated server handlers and React form state on the client, with zero-boilerplate type inference, headless UI components, multi-step support, and a composable middleware system.

---

## Goals

- End-to-end type safety: schema, server handler return type, and client state are all inferred automatically
- Framework-agnostic core with thin adapters per framework (Next.js App Router, Pages Router, Express, Hono, etc.)
- Minimal boilerplate — one file per action, one hook per form
- Open source from day one (MIT license)
- Designed for production: HIPAA-context EMR use case drove security and auditability decisions

---

## Non-Goals (v1)

- Styled components — headless only
- Server Actions transport — fetch-based API routes only
- Optimistic updates
- File upload handling
- GraphQL support

---

## Package Structure

Monorepo managed by Turborepo:

```
packages/
  core/           # safeform — zero framework deps
  next/           # @safeform/next — Next.js App Router + Pages Router adapters
  express/        # @safeform/express — Express adapter (post-v1)
  hono/           # @safeform/hono — Hono adapter (post-v1)
examples/
  next-app/       # fixture Next.js app — demo + Playwright E2E target
```

**Install:**
```bash
npm install safeform @safeform/next
```

**Peer dependencies:** React 18+, Zod 3+, react-hook-form 7+

---

## Transport

- Fetch-based API routes (not Server Actions)
- Rationale: HIPAA audit logging, FHIR integrations, future mobile app consumption, and standard HTTP middleware all require real HTTP endpoints
- Client sends JSON via `fetch`, server responds with JSON
- `import type` pattern used on client to prevent server code from entering client bundle

---

## Type Safety Model

```ts
// server-action.ts
export const upsertEmployeeAction = authedAction.create({ schema, payload }, handler)
export type UpsertEmployeeAction = typeof upsertEmployeeAction

// app/api/employees/route.ts
export const POST = createRouteHandler(upsertEmployeeAction)

// client.tsx
import type { UpsertEmployeeAction } from './server-action'
useForm<UpsertEmployeeAction>({ endpoint: '/api/employees', schema, ... })
```

- Server handler return type flows to client `state.data` and `onSuccess(data)` automatically
- No codegen, no separate type files

---

## Middleware System

Composable, stacked middleware with typed context:

```ts
// Define once per app
const publicAction = createAction()

const authedAction = createAction().use(async (next) => {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return next({ user: session.user })  // ctx.user is typed downstream
})

const adminAction = authedAction.use(async (next, ctx) => {
  if (ctx.user.role !== 'Admin') throw new Error('Forbidden')
  return next(ctx)
})
```

- Middleware is stacked via `.use()` — each layer extends the typed context
- `publicAction` has no middleware, `ctx` is `{}`
- Middleware runs before schema validation

---

## Action Definition

```ts
export const upsertEmployeeAction = authedAction.create({
  schema: upsertEmployeeSchema,           // z.ZodObject — user-submitted form data
  payload: z.object({                     // hidden, non-editable server-bound data
    employeeId: z.string().optional(),    // e.g. for upserts, facility scoping
  }),
}, async (data, payload, ctx) => {
  // data    — typed from schema parse result
  // payload — typed from payload schema (re-authorize before trusting!)
  // ctx     — typed from middleware chain

  const existing = await db.ssn.findFirst({ where: { value: data.ssn } })
  if (existing) return { fieldErrors: { ssn: ['SSN already in use'] } }

  return { employeeId: createdEmployee.id }
})
```

**Security requirement (documented, not enforced by library):**
Payload values (e.g. `facilityId`, `employeeId`) are sent from the client and must be re-authorized server-side. A malicious user can modify them. Always verify the authenticated user has access to the payload values before acting on them.

---

## Schema Types

### Single-step

```ts
const schema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['Admin', 'Cashier', 'Janitor']),
  dob: z.date(),
  isActive: z.boolean(),
  address: z.object({ city: z.string(), zip: z.string() }),
  tags: z.array(z.string()),
})
```

### Multi-step (unnamed — flat merge)

```ts
const schema = z.tuple([
  z.object({ firstName: z.string(), lastName: z.string() }),
  z.object({ address: z.string(), phone: z.string() }),
  z.object({ email: z.string(), password: z.string() }),
])
// TypeScript error if any key appears in more than one step tuple element
// Server handler receives flattened merged data: { firstName, lastName, address, phone, email, password }
```

### Multi-step (named — namespaced)

```ts
import { createSteps } from 'safeform'

const schema = createSteps({
  vitals: z.object({ heartRate: z.number(), bp: z.string() }),
  detox: z.object({ substanceUse: z.string(), lastUse: z.date() }),
  personal: z.object({ firstName: z.string(), lastName: z.string() }),
})
// Server handler receives namespaced data:
// { vitals: { heartRate, bp }, detox: { substanceUse, lastUse }, personal: { firstName, lastName } }
// TypeScript error if any key appears in more than one step's schema
```

Multi-step detection is automatic — `useForm` inspects whether the schema is a `z.ZodTuple` (unnamed) or a `createSteps` result (named). Step order follows object insertion order (guaranteed in modern JS for string keys).

---

## Route Handler Adapter

```ts
// app/api/employees/route.ts
import { createRouteHandler } from '@safeform/next'
import { upsertEmployeeAction } from '@/actions/employees'

export const POST = createRouteHandler(upsertEmployeeAction)
```

`createRouteHandler` handles:
- JSON body parsing
- Schema validation (returns 400 with field errors on failure)
- Middleware execution
- Handler invocation
- Error mapping: validation → 400, auth → 401, forbidden → 403, unexpected → 500

---

## Client Hook

```ts
import type { UpsertEmployeeAction } from '@/actions/employees'

const {
  handleSubmit,   // (e: FormEvent) => void
  state,          // { fieldErrors, error, data, isPending }
  step,           // current step index (multi-step only)
  totalSteps,     // (multi-step only)
  next,           // validate current step and advance (multi-step only)
  prev,           // go back (multi-step only)
  isFirstStep,    // boolean (multi-step only)
  isLastStep,     // boolean (multi-step only)
  FormField,      // context-aware headless field component
  FormArray,      // context-aware headless array component
} = useForm<UpsertEmployeeAction>({
  endpoint: '/api/employees',
  schema: upsertEmployeeSchema,
  payload: { employeeId: employee?.id },
  onSuccess: (data) => router.push(`/employees/${data.employeeId}`),
  onError: (error) => toast.error(error),
})
```

**Validation flow:**
1. `handleSubmit` called
2. Zod parses client-side — instant field errors if invalid, no fetch
3. If valid, `fetch` POST to `endpoint` with `{ data, payload }`
4. Server re-validates (never trusts client)
5. Response mapped to `state`, `onSuccess` or `onError` called

**Multi-step state:**
- Accumulated per-step data held in hook state (client-side only)
- Data lost on page refresh (acceptable)
- `next()` validates current step's sub-schema before advancing
- `handleSubmit` on last step sends all accumulated data merged

---

## State Shape

```ts
type FormState<TData> = {
  fieldErrors: DeepPartial<FieldErrorMap<TSchema>>  // per-field, shown inline
  error: string | null                               // global — for toaster
  data: TData | null                                 // typed server return
  isPending: boolean                                 // fetch in-flight
}
```

---

## Headless Components

Built on react-hook-form internally. Users never interact with RHF directly.

### FormField

```tsx
<FormField name="firstName">
  {({ value, onChange, onBlur, errors }) => (
    <input value={value} onChange={e => onChange(e.target.value)} />
  )}
</FormField>

// Nested object — dot notation
<FormField name="address.city">
  {({ value, onChange, errors }) => <input ... />}
</FormField>
```

- `name` is typed as a deep keypath of the schema (dot-notation)
- `value` is typed to the Zod field type: `string`, `number`, `boolean`, `Date`, enum literal
- `errors` is `string[]`
- Reads form context established by `useForm` — no prop threading

### FormArray

```tsx
<FormArray name="tags">
  {({ items, append, remove }) =>
    items.map((_, i) => (
      <FormField key={i} name={`tags.${i}`}>
        {({ value, onChange }) => (
          <div>
            <input value={value} onChange={e => onChange(e.target.value)} />
            <button onClick={() => remove(i)}>Remove</button>
          </div>
        )}
      </FormField>
    ))
  }
</FormArray>
```

### Shadcn adapter pattern (user writes once, reuses everywhere)

```tsx
// app/components/fields/text-field.tsx
import { FormField } from 'safeform'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function TextField({ name, label }: { name: string; label: string }) {
  return (
    <FormField name={name}>
      {({ value, onChange, onBlur, errors }) => (
        <div className="space-y-1">
          <Label>{label}</Label>
          <Input
            value={value}
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

---

## Supported Field Types (v1)

`FormField` supports:
- `z.string()` → `value: string`
- `z.number()` → `value: number`
- `z.boolean()` → `value: boolean`
- `z.date()` → `value: Date`
- `z.enum([...])` → `value: typeof enum[number]`
- `z.array(...)` → via `FormArray`
- `z.object(...)` → via dot-notation in `FormField name`

---

## Testing Strategy

### Unit tests
- `createAction` factory
- Middleware chain composition and context typing
- Schema merging and collision detection for multi-step
- Deep keypath type utilities

### Integration tests
- Real HTTP requests against real route handlers (no mocking)
- Schema validation errors → 400 responses
- Auth middleware → 401 responses
- Handler field errors → structured error response
- Handler success → typed response

### E2E tests (Playwright)
- Against `examples/next-app/` fixture
- Single-step form: fill, submit, success
- Single-step form: validation errors display inline
- Multi-step form: navigation, per-step validation, final submission
- Auth-protected action: unauthenticated → error
- `FormArray`: add item, remove item, submit

---

## v1 Scope

- `packages/core`: `createAction`, `useForm`, `FormField`, `FormArray`, middleware system, multi-step
- `packages/next`: `createRouteHandler` for App Router
- `examples/next-app`: demo + E2E fixture
- Full test suite (unit + integration + Playwright)
- README, API docs

## Post-v1

- `@safeform/next` Pages Router adapter
- `@safeform/express`
- `@safeform/hono`
- Optimistic updates
- File upload support
- DevTools integration
