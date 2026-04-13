# @safeform/core

## 4.2.0

### Minor Changes

- ee2e606: feat(core): add useIsPending hook — safe outside Provider, returns false

## 4.1.0

### Minor Changes

- 2be0374: feat(core): expose isPending on SafeFormContext for use inside the Provider

### Patch Changes

- aa9abd3: fix(changesets): stop minor releases from cascading to major
- 8040057: docs: add FormField integration example for useMask

## 4.0.0

### Minor Changes

- 21dd629: feat(core): add rawMask() Zod helper for slot-char validation and transformation
- 1dc93eb: feat(core): expose rawValue from useMask for unformatted submission

### Patch Changes

- 2b68480: docs: update masked input docs to reflect useMask hook

## 3.0.1

### Patch Changes

- 3d5ce83: Added a Masked Inputs section to the core and monorepo READMEs covering `MaskedField`, built-in masks, custom patterns, and Zod validation with

## 3.0.0

### Minor Changes

- 0618f20: Added `maskToZod(mask, message?)` to generate a Zod schema from any mask name or custom pattern, and `MASK_SCHEMAS` — a pre-built map of Zod
- 2e90b25: Added `MaskedField`, a render-prop component for masked text inputs. Supports

## 2.0.0

### Minor Changes

- 523f711: fix: FieldName now resolves deep dot-notation paths via ZodPaths

## 1.0.1

### Patch Changes

- 8118ec5: fix: include README.md in published files for both packages

## 1.0.0

### Minor Changes

- 11ce7e5: feat: add formProps spread, TypedCtx, and FieldName for typed reusable field components
- 28eca3d: refactor: switch middleware API from next-based to return-based

## 0.0.4

### Patch Changes

- f17012a: refactor: colocate schema.ts + route.ts per API endpoint

## 0.0.3

### Patch Changes

- 8cbcc09: Add package-level README

## 0.0.2

### Patch Changes

- b62f014: Fix stale [safeform] error log prefix after package rename
