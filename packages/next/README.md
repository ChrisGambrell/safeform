# @safeform/next

Next.js App Router adapter for [`@safeform/core`](https://npmjs.com/package/@safeform/core).

```bash
npm install @safeform/core @safeform/next
```

> **Peer dependencies:** Next.js 14+, Zod 3+

---

## Usage

Mount a safeform action as a Next.js App Router route handler with a single line:

```ts
// app/api/employees/route.ts
import { createRouteHandler } from '@safeform/next'
import { upsertEmployeeAction } from '@/actions/employees'

export const POST = createRouteHandler(upsertEmployeeAction)
```

The route handler takes care of:

- Parsing and validating the JSON request body against your action's schema
- Running the middleware chain (auth, logging, etc.)
- Parsing and validating the `payload` if your action defines one
- Returning structured JSON responses the client can consume
- Catching unexpected errors and returning a safe 500 response

---

## Request format

The client (`useForm` from `@safeform/core`) posts JSON in this shape:

```json
{ "data": { ...formValues }, "payload": { ...payloadValues } }
```

`payload` is omitted if the action has no payload schema.

---

## Response format

All responses are JSON:

```ts
// Success
{ "success": true, "data": { ...handlerReturnData } }

// Validation failure
{ "success": false, "fieldErrors": { "fieldName": ["error message"] } }

// Global error
{ "success": false, "error": "error message" }

// Unexpected server error
{ "success": false, "error": "Internal server error" }
```

---

## Multi-step forms

`createRouteHandler` handles both unnamed (tuple) and named (`createSteps`) multi-step schemas automatically. No extra configuration needed.

---

## Full example

```ts
// lib/schemas/employee.ts
import { z } from 'zod'

export const upsertEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['Admin', 'Cashier', 'Janitor']),
})

// actions/employees.ts
import { createAction } from '@safeform/core'
import { upsertEmployeeSchema } from '@/lib/schemas/employee'
import { z } from 'zod'

const authedAction = createAction().use(async (next) => {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return next({ user: session.user })
})

export const upsertEmployeeAction = authedAction.create({
  schema: upsertEmployeeSchema,
  payload: z.object({ employeeId: z.string().optional() }),
}, async (data, payload, ctx) => {
  const employee = await db.employee.upsert({ ... })
  return { success: true as const, data: { employeeId: employee.id } }
})

// app/api/employees/route.ts
import { createRouteHandler } from '@safeform/next'
import { upsertEmployeeAction } from '@/actions/employees'

export const POST = createRouteHandler(upsertEmployeeAction)
```

---

## License

MIT
