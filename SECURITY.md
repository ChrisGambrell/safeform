# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | Yes       |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report vulnerabilities by emailing the maintainers directly. You should receive a response within 48 hours. If the issue is confirmed, a patch will be released as soon as possible.

## Library Security Model

safeform is a form handling library. A few properties of the security model worth knowing:

### Payload values are client-sent

The `payload` option in `useForm()` lets you attach server-bound data (e.g. `facilityId`, `employeeId`) to a form. This data is serialized by the client and included in the POST body — **a malicious user can modify it**.

safeform validates the payload against its Zod schema on the server, but validation alone does not prove authorization. **Always re-authorize payload values in your handler:**

```ts
const action = authedAction.create({
  schema,
  payload: z.object({ facilityId: z.string() }),
}, async (data, payload, ctx) => {
  // Never skip this
  const access = await db.facilityUser.findFirst({
    where: { facilityId: payload.facilityId, userId: ctx.user.id },
  })
  if (!access) throw new Error('Forbidden')
})
```

### Server always re-validates

safeform's route handler always re-parses incoming data against the full schema on the server, regardless of client-side validation results. Client validation is for UX only.

### Middleware throws === HTTP error

If any middleware throws `new Error('Unauthorized')` or `new Error('Forbidden')`, the route handler returns a 401 or 403 respectively. All other thrown errors return 500. No error details are leaked to the client.
