# web

The rebuilt Nuspace frontend. Runs beside the existing `frontend/` until it
reaches parity, at which point it takes over and `frontend/` is deleted.

**Stack:** Vite 8 · React 19 · TypeScript 7 · TanStack Router (file-based) ·
TanStack Query · Tailwind v4 · shadcn/ui on Base UI.

## Running it

The app needs the backend, so bring up the stack rather than running `pnpm dev`
standalone:

```sh
cd ../infra
cp .env.example .env    # fill TELEGRAM_BOT_TOKEN
docker compose up --build
```

|                         |                      |
| ----------------------- | -------------------- |
| `http://localhost`      | existing `frontend/` |
| `http://localhost:6767` | this app             |
| `http://localhost:8080` | pgAdmin              |

Both frontends talk to the same backend, so any screen can be compared
side by side.

To run outside Docker, `pnpm dev` serves on 5173 and proxies `/api` to
`http://localhost` (override with `VITE_API_PROXY_TARGET`).

### Signing in locally

`MOCK_KEYCLOAK=true` is the default, so no real credentials are needed:

```
http://localhost:6767/api/login?mock_user=1
```

**The post-login redirect lands on `http://localhost` — port 80, the old app.**
The backend builds it from `DEV_APP_URL` rather than the request Host. It is
only cosmetic: cookies are not port-scoped, so you are already signed in.
Navigate back to `:6767` and the session is live. Don't repoint `DEV_APP_URL`
at 6767 — that just moves the problem onto the old app.

## Commands

```sh
pnpm dev            # dev server
pnpm build          # typecheck + production build
pnpm typecheck      # tsc -b --noEmit over the project references
pnpm lint           # oxlint, including type-aware rules
pnpm format         # prettier, sorts Tailwind classes
pnpm api:generate   # regenerate src/api/schema.d.ts from the backend
pnpm api:check      # fail if the committed schema is stale
```

## API types are generated, not written

`src/api/schema.d.ts` is generated from the backend's OpenAPI document and
committed. Nothing about a request or response is typed by hand, so a backend
change that breaks the contract fails `tsc` instead of surfacing at runtime.

Regenerate with the backend running (it only serves `/api/openapi.json` when
`IS_DEBUG=true`):

```sh
pnpm api:generate
```

`pnpm api:check` runs the same generation and fails on any diff, so drift is
caught in CI.

The generator runs in an isolated environment pinned to TypeScript 6.
`openapi-typescript` emits through the compiler's `ts.factory` AST API, which
TypeScript 7 does not expose. Its output is plain text, so the version that
produced it does not matter.

**The one exception is `/me`.** The backend declares it `user: Dict[str, Any]`,
so OpenAPI reports an opaque index signature and codegen cannot describe it.
`src/features/auth/schema.ts` parses it with zod, reusing the generated
`UserRole` union so a backend role change still breaks the build. That file is
the only place a payload shape is written by hand — everywhere else, use the
generated types.

## Conventions

- **One QueryClient**, exported from `src/app/query-client.ts` and passed to
  both `QueryClientProvider` and the router context. Never construct another.
- **Auth is a route concern.** `routes/_app.tsx` guards everything beneath it in
  `beforeLoad`. Pages assume a signed-in user via `useCurrentUser()`.
- **Permissions go through `usePermissions()`**, not inline role checks.
- **Datetimes cross the boundary in `lib/datetime.ts`.** The backend reads a
  naive datetime as Almaty local time; that conversion lives in one file.
- **Query keys come from `src/api/query-keys.ts`**, so invalidation can target a
  whole subtree.
- **Loading, error and empty states** go through `components/query-boundary.tsx`.
- **Use the design tokens** (`bg-muted`, `text-foreground`, `border-border`),
  not raw palette classes like `bg-gray-100`. The tokens already handle dark
  mode; palette classes need a hand-written `dark:` variant for every use and
  drift out of sync.
- **Never build a Tailwind class by interpolation** (`` `grid-cols-${n}` ``).
  The scanner cannot see it and the class is silently dropped from the
  stylesheet.

## Linting

Oxlint, not ESLint. typescript-eslint refuses to load under TypeScript 7 and
has no supporting release yet, while oxlint parses with its own Rust parser and
its type-aware mode tracks TS 7 via `oxlint-tsgolint`.
