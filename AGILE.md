# safeform — Agile Project

## Overview

| | |
|---|---|
| **Project** | safeform |
| **Goal** | Ship a type-safe, open-source React form library with API route integration to npm |
| **Methodology** | Scrum — 2-week sprints |
| **Velocity target** | ~20 points/sprint |
| **Point scale** | 1 = trivial, 2 = small, 3 = medium, 5 = large, 8 = extra large |

---

## Epics

| ID | Epic | Description |
|---|---|---|
| E1 | Project Foundation | Monorepo scaffold, tooling, CI/CD, TypeScript config |
| E2 | Action System | `createAction`, middleware chaining, typed context |
| E3 | Schema System | Single-step, unnamed multi-step (`z.tuple`), named multi-step (`createSteps`), collision detection |
| E4 | Route Handler | `createRouteHandler` for `@safeform/next` App Router |
| E5 | Client Hook | `useForm`, validation flow, state, multi-step navigation |
| E6 | Headless Components | `FormField`, `FormArray`, React Context, deep keypath typing |
| E7 | Unit & Integration Tests | Pure logic tests + real HTTP integration tests |
| E8 | E2E Tests | Playwright suite against the fixture Next.js app |
| E9 | Example App | `examples/next-app` — single-step, multi-step, auth demos |
| E10 | Docs & Publishing | README, API docs, npm publish, GitHub Actions release |

---

## Backlog

### E1 — Project Foundation

| ID | Story | Points | Priority |
|---|---|---|---|
| F-1 | Initialize Turborepo monorepo with `packages/core`, `packages/next`, `examples/next-app` | 3 | P0 |
| F-2 | Configure TypeScript strict mode with shared `tsconfig.base.json` | 2 | P0 |
| F-3 | Set up ESLint + Prettier with shared configs | 2 | P0 |
| F-4 | Configure Vitest for unit and integration tests in `packages/core` | 2 | P0 |
| F-5 | Configure Playwright in `examples/next-app` | 2 | P0 |
| F-6 | GitHub Actions CI: typecheck, lint, test, build on every PR | 3 | P0 |
| F-7 | GitHub Actions release: publish to npm on tag push | 3 | P1 |
| F-8 | Set up Changesets for versioning and changelogs | 2 | P1 |

---

### E2 — Action System

| ID | Story | Points | Priority |
|---|---|---|---|
| A-1 | `createAction()` factory returns a base action builder with no middleware | 3 | P0 |
| A-2 | `.use(middleware)` adds a typed middleware layer and returns a new builder | 5 | P0 |
| A-3 | Middleware layers compose — each receives the previous layer's ctx and extends it | 5 | P0 |
| A-4 | `builder.create({ schema, payload }, handler)` produces a typed action object | 3 | P0 |
| A-5 | Handler receives `(data, payload, ctx)` — all three typed from their respective schemas/middleware | 3 | P0 |
| A-6 | Handler can return field errors: `{ fieldErrors: { [key]: string[] } }` | 2 | P0 |
| A-7 | Handler can return a global error: `{ error: string }` | 1 | P0 |
| A-8 | Handler can return arbitrary typed success data (inferred return type) | 2 | P0 |
| A-9 | Middleware that throws maps to a structured error response (401, 403, 500) | 3 | P0 |

---

### E3 — Schema System

| ID | Story | Points | Priority |
|---|---|---|---|
| S-1 | Single-step schema: `z.object({...})` — detected and passed through as-is | 1 | P0 |
| S-2 | Unnamed multi-step: `z.tuple([...])` — auto-detected, data flattened on server | 5 | P0 |
| S-3 | Named multi-step: `createSteps({ name: z.object({...}) })` — data namespaced on server | 5 | P0 |
| S-4 | TypeScript error when any field key is shared across steps (unnamed tuple) | 5 | P0 |
| S-5 | TypeScript error when any field key is shared across steps (named `createSteps`) | 5 | P0 |
| S-6 | `payload` schema: `z.object({...})` — validated separately, passed to handler | 3 | P0 |
| S-7 | Deep keypath type utility: maps `"address.city"` → field type, `"tags.0"` → element type | 8 | P0 |

---

### E4 — Route Handler

| ID | Story | Points | Priority |
|---|---|---|---|
| R-1 | `createRouteHandler(action)` returns a Next.js App Router `POST` handler | 3 | P0 |
| R-2 | Handler parses JSON body and extracts `{ data, payload }` | 2 | P0 |
| R-3 | Handler runs middleware chain before invoking the action | 2 | P0 |
| R-4 | Schema validation failure → 400 response with structured field errors | 2 | P0 |
| R-5 | Middleware `Unauthorized` throw → 401 response | 1 | P0 |
| R-6 | Middleware `Forbidden` throw → 403 response | 1 | P0 |
| R-7 | Handler field errors → 422 response with `{ fieldErrors }` | 2 | P0 |
| R-8 | Handler global error → 400 response with `{ error }` | 1 | P0 |
| R-9 | Unexpected handler throw → 500 response (no error detail leaked) | 2 | P0 |
| R-10 | Handler success → 200 response with typed data payload | 1 | P0 |
| R-11 | `createPagesRouteHandler(action)` for Next.js Pages Router (`req`/`res` style) | 3 | P2 |

---

### E5 — Client Hook

| ID | Story | Points | Priority |
|---|---|---|---|
| H-1 | `useForm<TAction>({ endpoint, schema, payload, onSuccess, onError })` returns form controls | 5 | P0 |
| H-2 | `handleSubmit` runs Zod client-side on submit — sets `fieldErrors` instantly if invalid, no fetch | 3 | P0 |
| H-3 | If client validation passes, `fetch POST` to `endpoint` with `{ data, payload }` | 3 | P0 |
| H-4 | Server field errors mapped to `state.fieldErrors` | 2 | P0 |
| H-5 | Server global error calls `onError(error)` and sets `state.error` | 1 | P0 |
| H-6 | Server success calls `onSuccess(data)` with typed server return | 2 | P0 |
| H-7 | `state.isPending` is `true` during fetch, `false` otherwise | 1 | P0 |
| H-8 | `useForm` auto-detects multi-step from `z.ZodTuple` schema | 3 | P0 |
| H-9 | `useForm` auto-detects named multi-step from `createSteps` result | 3 | P0 |
| H-10 | `next()` validates current step's sub-schema client-side before advancing | 3 | P0 |
| H-11 | `prev()` goes back without validation | 1 | P0 |
| H-12 | `step`, `totalSteps`, `isFirstStep`, `isLastStep` exposed from hook | 1 | P0 |
| H-13 | Final step `handleSubmit` sends all accumulated step data merged/namespaced | 3 | P0 |
| H-14 | TypeScript error if `TAction` schema does not match provided `schema` option | 5 | P1 |
| H-15 | TypeScript error if `TAction` has `payload` but `payload` option is omitted | 3 | P1 |

---

### E6 — Headless Components

| ID | Story | Points | Priority |
|---|---|---|---|
| C-1 | `useForm` establishes React Context so child components can read form state | 3 | P0 |
| C-2 | `FormField` component reads context, renders render-prop with `{ value, onChange, onBlur, errors }` | 5 | P0 |
| C-3 | `FormField` `name` prop typed as deep keypath of schema (dot-notation) | 5 | P0 |
| C-4 | `FormField` `value` typed to the Zod field type (`string`, `number`, `boolean`, `Date`, enum) | 5 | P0 |
| C-5 | `FormField` `errors` sourced from `state.fieldErrors` for its field path | 2 | P0 |
| C-6 | `FormArray` component renders render-prop with `{ items, append, remove }` | 5 | P0 |
| C-7 | `FormArray` `name` typed as array keypath of schema | 3 | P0 |
| C-8 | Nested `FormField` inside `FormArray` — `name="tags.0"` wires to correct RHF field | 3 | P0 |
| C-9 | `FormField` and `FormArray` work correctly inside multi-step forms | 3 | P0 |

---

### E7 — Unit & Integration Tests

| ID | Story | Points | Priority |
|---|---|---|---|
| T-1 | Unit: `createAction` factory produces correctly shaped action objects | 2 | P0 |
| T-2 | Unit: middleware chain executes in order, ctx types accumulate correctly | 3 | P0 |
| T-3 | Unit: stacked middleware — each layer receives previous ctx | 2 | P0 |
| T-4 | Unit: `createSteps` — collision detection throws/errors on duplicate keys | 3 | P0 |
| T-5 | Unit: `createSteps` — data is correctly namespaced in handler | 2 | P0 |
| T-6 | Unit: `z.tuple` multi-step — data is correctly flattened in handler | 2 | P0 |
| T-7 | Unit: deep keypath type utility resolves `"address.city"` to correct type | 3 | P0 |
| T-8 | Integration: valid request → 200 with typed data | 2 | P0 |
| T-9 | Integration: invalid schema → 400 with field errors | 2 | P0 |
| T-10 | Integration: missing required field → 400 with correct field key | 2 | P0 |
| T-11 | Integration: middleware throws Unauthorized → 401 | 2 | P0 |
| T-12 | Integration: middleware throws Forbidden → 403 | 1 | P0 |
| T-13 | Integration: handler returns field errors → 422 with `fieldErrors` | 2 | P0 |
| T-14 | Integration: handler returns global error → 400 with `error` | 1 | P0 |
| T-15 | Integration: unexpected handler throw → 500, no detail leaked | 2 | P0 |
| T-16 | Integration: named multi-step action — flattened data reaches handler correctly | 3 | P0 |
| T-17 | Integration: payload validated separately, passed to handler | 2 | P0 |

---

### E8 — E2E Tests (Playwright)

| ID | Story | Points | Priority |
|---|---|---|---|
| E-1 | Single-step form: fill all fields, submit, assert success state and `onSuccess` called | 3 | P0 |
| E-2 | Single-step form: submit empty, assert field errors display inline | 3 | P0 |
| E-3 | Single-step form: server-returned field error (`ssn already in use`) displays on correct field | 3 | P0 |
| E-4 | Single-step form: global server error displays (e.g. via toast) | 2 | P0 |
| E-5 | Single-step form: `isPending` disables submit button during fetch | 2 | P0 |
| E-6 | Multi-step form: `next()` advances step only when current step valid | 3 | P0 |
| E-7 | Multi-step form: `next()` shows errors on current step when invalid | 3 | P0 |
| E-8 | Multi-step form: `prev()` goes back without clearing data | 2 | P0 |
| E-9 | Multi-step form: final step submit sends all accumulated data | 3 | P0 |
| E-10 | Named multi-step form: data arrives namespaced correctly at server | 3 | P0 |
| E-11 | Auth-protected action: unauthenticated submission → error state on client | 3 | P0 |
| E-12 | `FormArray`: append item, fill it, remove another, submit — correct data sent | 5 | P0 |
| E-13 | Nested `FormField` (`address.city`): value, error display, submit | 3 | P0 |
| E-14 | `payload` passed correctly to server alongside form data | 2 | P0 |

---

### E9 — Example App

| ID | Story | Points | Priority |
|---|---|---|---|
| X-1 | Scaffold `examples/next-app` with Next.js 14 App Router, Tailwind, shadcn/ui | 3 | P0 |
| X-2 | Employee upsert form — single-step, auth-protected, with `payload` (employeeId) | 3 | P0 |
| X-3 | Contact form — single-step, public action, no auth | 2 | P0 |
| X-4 | Patient intake form — named multi-step (`createSteps`): vitals, history, personal | 5 | P0 |
| X-5 | Onboarding form — unnamed multi-step (`z.tuple`): account, profile, preferences | 3 | P0 |
| X-6 | Dynamic tag list — `FormArray` demo | 3 | P1 |
| X-7 | Shadcn adapter components (`TextField`, `SelectField`, `CheckboxField`, `DateField`) | 5 | P1 |

---

### E10 — Docs & Publishing

| ID | Story | Points | Priority |
|---|---|---|---|
| D-1 | README finalized with all examples accurate against implementation | 2 | P0 |
| D-2 | JSDoc on all public APIs (`createAction`, `useForm`, `FormField`, `FormArray`, `createSteps`, `createRouteHandler`) | 3 | P0 |
| D-3 | CONTRIBUTING.md — local setup, how to run tests, PR process | 2 | P0 |
| D-4 | SECURITY.md — payload re-authorization requirement documented prominently | 1 | P0 |
| D-5 | npm publish config: `main`, `module`, `types`, `exports` in `package.json` | 2 | P0 |
| D-6 | Tree-shaking validated: server-only imports don't appear in client bundle | 3 | P0 |
| D-7 | GitHub Actions: publish `safeform` and `@safeform/next` on release tag | 2 | P0 |
| D-8 | GitHub issue templates: bug report, feature request | 1 | P2 |

---

## Sprint Plan

### Sprint 1 — Foundation + Action System
**Goal:** Monorepo running, CI green, action system fully typed and tested.

| ID | Story | Points |
|---|---|---|
| F-1 | Initialize Turborepo monorepo | 3 |
| F-2 | TypeScript strict config | 2 |
| F-3 | ESLint + Prettier | 2 |
| F-4 | Vitest setup | 2 |
| F-6 | GitHub Actions CI | 3 |
| A-1 | `createAction()` factory | 3 |
| A-2 | `.use(middleware)` layer | 5 |
| **Total** | | **20** |

---

### Sprint 2 — Action System Complete + Schema System
**Goal:** Middleware composition complete, all schema types (single, unnamed multi, named multi) working.

| ID | Story | Points |
|---|---|---|
| A-3 | Middleware composition | 5 |
| A-4 | `builder.create(...)` | 3 |
| A-5 | Handler `(data, payload, ctx)` typed | 3 |
| A-6 | Handler field errors | 2 |
| A-7 | Handler global error | 1 |
| A-8 | Handler success return | 2 |
| S-1 | Single-step schema | 1 |
| S-6 | Payload schema | 3 |
| **Total** | | **20** |

---

### Sprint 3 — Multi-Step Schema + Route Handler
**Goal:** Both multi-step modes working, route handler complete with all HTTP mappings.

| ID | Story | Points |
|---|---|---|
| S-2 | Unnamed multi-step (`z.tuple`) | 5 |
| S-3 | Named multi-step (`createSteps`) | 5 |
| S-4 | Collision detection — unnamed | 5 |
| R-1 | `createRouteHandler` base | 3 |
| R-2 | JSON body parsing | 2 |
| **Total** | | **20** |

---

### Sprint 4 — Route Handler Complete + Client Hook Core
**Goal:** Route handler production-ready, `useForm` working for single-step.

| ID | Story | Points |
|---|---|---|
| S-5 | Collision detection — named | 5 |
| A-9 | Middleware error mapping | 3 |
| R-3 | Middleware runs in handler | 2 |
| R-4 | 400 on schema failure | 2 |
| R-5 | 401 on Unauthorized | 1 |
| R-6 | 403 on Forbidden | 1 |
| R-7 | 422 on field errors | 2 |
| R-8 | 400 on global error | 1 |
| R-9 | 500 on unexpected throw | 2 |
| R-10 | 200 on success | 1 |
| **Total** | | **20** |

---

### Sprint 5 — Client Hook Complete
**Goal:** `useForm` fully working — single-step, multi-step, payload, callbacks.

| ID | Story | Points |
|---|---|---|
| H-1 | `useForm` base | 5 |
| H-2 | Client-side Zod validation | 3 |
| H-3 | Fetch on validation pass | 3 |
| H-4 | Map server field errors | 2 |
| H-5 | Global error → `onError` | 1 |
| H-6 | Success → `onSuccess` typed | 2 |
| H-7 | `isPending` state | 1 |
| H-8 | Multi-step detection (tuple) | 3 |
| **Total** | | **20** |

---

### Sprint 6 — Multi-Step Hook + Headless Components Core
**Goal:** Multi-step navigation working, `FormField` wired to context.

| ID | Story | Points |
|---|---|---|
| H-9 | Multi-step detection (named) | 3 |
| H-10 | `next()` validates current step | 3 |
| H-11 | `prev()` | 1 |
| H-12 | Step state exposed | 1 |
| H-13 | Final step submit | 3 |
| C-1 | React Context from `useForm` | 3 |
| C-2 | `FormField` render prop | 5 |
| S-7 | Deep keypath type utility | 8 |
| **Total** | | **27** *(carry S-7 if needed)* |

---

### Sprint 7 — Headless Components Complete + Unit Tests
**Goal:** `FormField` fully typed, `FormArray` working, unit tests done.

| ID | Story | Points |
|---|---|---|
| C-3 | `FormField` `name` keypath typing | 5 |
| C-4 | `FormField` `value` typed to Zod type | 5 |
| C-5 | `FormField` errors from state | 2 |
| C-6 | `FormArray` render prop | 5 |
| C-7 | `FormArray` name typing | 3 |
| T-1 | Unit: `createAction` | 2 |
| T-2 | Unit: middleware chain | 3 |
| **Total** | | **25** *(carry if needed)* |

---

### Sprint 8 — Integration Tests + E2E Foundation
**Goal:** All integration tests passing, Playwright running against fixture app.

| ID | Story | Points |
|---|---|---|
| C-8 | Nested `FormField` in `FormArray` | 3 |
| C-9 | Components in multi-step | 3 |
| T-3 through T-17 | Full integration test suite | 13 |
| F-5 | Playwright setup | 2 |
| X-1 | Scaffold `examples/next-app` | 3 |
| **Total** | | **24** |

---

### Sprint 9 — E2E Tests + Example App
**Goal:** Full Playwright suite green, example app complete.

| ID | Story | Points |
|---|---|---|
| E-1 through E-14 | Full E2E suite | 39 |
| X-2 | Employee upsert demo | 3 |
| X-3 | Contact form demo | 2 |
| **Total** | | **~20/sprint across 2 sprints** |

---

### Sprint 10 — Example App + Type Safety + Docs
**Goal:** Example app complete, TypeScript guards on client, library ready to publish.

| ID | Story | Points |
|---|---|---|
| X-4 | Patient intake (named multi-step) | 5 |
| X-5 | Onboarding (unnamed multi-step) | 3 |
| H-14 | TS error on schema mismatch | 5 |
| H-15 | TS error on missing payload | 3 |
| D-1 | README finalized | 2 |
| D-2 | JSDoc on public APIs | 3 |
| **Total** | | **21** |

---

### Sprint 11 — Polish + Publish
**Goal:** Ship to npm.

| ID | Story | Points |
|---|---|---|
| F-7 | GitHub Actions release | 3 |
| F-8 | Changesets versioning | 2 |
| D-3 | CONTRIBUTING.md | 2 |
| D-4 | SECURITY.md | 1 |
| D-5 | npm publish config | 2 |
| D-6 | Tree-shaking validation | 3 |
| D-7 | GitHub Actions publish | 2 |
| X-6 | FormArray demo | 3 |
| X-7 | Shadcn adapters | 5 |
| **Total** | | **23** |

---

## Definition of Done

A story is done when:
- [ ] Implementation complete and building without TypeScript errors
- [ ] Unit or integration test covers the behavior (where applicable)
- [ ] No regressions in existing tests (`pnpm test` passes)
- [ ] Code reviewed (self or pair)
- [ ] Relevant docs/JSDoc updated

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Deep keypath TypeScript utility too complex | Medium | High | Spike in Sprint 1; reference react-hook-form's implementation |
| Collision detection type-level enforcement brittle | Medium | Medium | Comprehensive TS test cases using `@ts-expect-error` |
| react-hook-form internals change between versions | Low | Medium | Pin RHF minor version, abstract behind internal adapter |
| Bundle boundary leak (server code on client) | Medium | High | Tree-shaking validation test in Sprint 11; `publint` in CI |
| E2E test flakiness | High | Low | Playwright retry config, deterministic test fixtures |
