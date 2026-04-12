# Contributing to safeform

Thank you for your interest in contributing!

## Development Setup

**Prerequisites:** Node 20+, pnpm 9+

```bash
git clone https://github.com/ChrisGambrell/safeform.git
cd safeform
pnpm install
pnpm build
```

## Project Structure

```
packages/
  core/          safeform — framework-agnostic core
  next/          @safeform/next — Next.js App Router adapter
examples/
  next-app/      Playwright E2E fixture (Next.js 15)
```

## Workflow

```bash
pnpm build        # Build all packages
pnpm test         # Unit + integration tests
pnpm typecheck    # TypeScript type-check across all packages
pnpm lint         # ESLint

# E2E tests (from examples/next-app)
cd examples/next-app
pnpm exec playwright test
```

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes with tests
3. Run `pnpm test` and `pnpm build` — both must pass
4. Add a changeset: `pnpm changeset` (select affected packages and describe the change)
5. Open a pull request against `main`

## Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and release.

- **Bug fix** → patch bump
- **New feature (backwards-compatible)** → minor bump
- **Breaking change** → major bump

Run `pnpm changeset` and follow the prompts before opening your PR.

## Code Style

- TypeScript strict mode — no `any` in public API surface
- No default exports
- Tests live next to source files (`*.test.ts` / `*.test.tsx`)

## License

By contributing you agree that your contributions will be licensed under the MIT License.
