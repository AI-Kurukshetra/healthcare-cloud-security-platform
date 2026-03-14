# Healthcare Project

Greenfield scaffold for a Next.js 15 healthcare application using the stack and workflow defined in `AGENTS.md`.

## Included
- Next.js 15 App Router with TypeScript strict mode
- Tailwind CSS v3 theming
- Supabase SSR helpers and middleware
- React Hook Form + Zod baseline validation
- TanStack Query provider
- Vitest and Playwright configuration

## Get Started
1. Copy `.env.example` to `.env.local` and provide Supabase credentials.
2. Run `pnpm install`.
3. Run `pnpm dev`.

## Risk E2E Automation
Set these variables to run deterministic risk-register E2E setup:
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- Optional explicit staff credentials: `E2E_STAFF_EMAIL`, `E2E_STAFF_PASSWORD`
- Optional: `E2E_ORG_SLUG`, `E2E_ORG_NAME`, `E2E_RISK_TITLE_PREFIX`, `E2E_RESET_USER` (defaults to `true`)

Run:
- `pnpm test:e2e:risk`
- `pnpm test:e2e:baa`
- `pnpm test:e2e:backup`

## CI
GitHub Actions workflow is defined in `.github/workflows/ci.yml` and runs:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e:invite` (only when required secrets are configured)

Required repository secrets for invite E2E:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

Optional invite E2E secrets:
- `E2E_ORG_SLUG`
- `E2E_ORG_NAME`
