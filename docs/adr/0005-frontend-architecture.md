# ADR 0005: Frontend Architecture

## Status

Accepted

## Context

The frontend needed a clear stack, API integration pattern, and media handling approach.

## Decision

**Stack:** Vite 8 · React 19 · TypeScript 7 · TanStack Router (file-based) · TanStack Query · Tailwind v4 · shadcn/ui on Base UI

**API types are generated, not written:**
- `src/api/schema.d.ts` is regenerated from the backend OpenAPI document via `pnpm api:generate`
- `pnpm api:check` fails if the committed schema is stale (runs in CI)
- The only hand-written payload shape is `/me` (parsed with zod in `src/features/auth/schema.ts`)

**Media uploads use a three-step presigned flow:**
1. Client requests a signed PUT URL from the backend
2. Client uploads bytes directly to GCS
3. GCS notifies the backend via Pub/Sub

Bytes never pass through the API. The `x-goog-meta-*` headers are part of the signature.

**Other decisions:**
- One `QueryClient` in `src/app/query-client.ts` — never construct another
- Auth is a route concern: `routes/_app.tsx` guards in `beforeLoad`
- Permissions go through `usePermissions()`, not inline role checks
- Datetimes cross the boundary in `lib/datetime.ts` (backend reads naive datetime as Almaty local time)
- Query keys from `src/api/query-keys.ts` for subtree invalidation
- Loading/error/empty states through `components/query-boundary.tsx`

## Consequences

- Type safety enforced at compile time — backend contract changes break `tsc`
- No bytes through the API for media — scales better, GCS handles the load
- Consistent auth and permission patterns across all routes

## Related

- ADR 0004 (frontend conventions)
