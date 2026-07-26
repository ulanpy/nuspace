# web

The Nuspace frontend. Serves `http://localhost` in development and everything
CI deploys to production.

The previous app in `frontend/` is still in the repository for one release as a
fallback and is no longer routed to or built. Deleting it is a follow-up.

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

|                         |          |
| ----------------------- | -------- |
| `http://localhost`      | this app |
| `http://localhost:8080` | pgAdmin  |

To compare against the old app, point `$proxy_upstream` in
`infra/nginx/nginx.dev.conf` back at `frontend:5173` and reload nginx.

To run outside Docker, `pnpm dev` serves on 5173 and proxies `/api` to
`http://localhost` (override with `VITE_API_PROXY_TARGET`).

### HMR can go stale — check before you trust what you see

This repo runs under **Docker Desktop on Linux**, which shares the host
filesystem into a VM. That layer desynchronizes: new files appear, but files
edited **in place** can keep serving old content to the container for hours.
Vite never fires, because from inside the container nothing changed.

The failure is quiet and it will waste your time — the page looks fine, it is
just not your code. A route returning 200 proves nothing either, since the dev
server serves the same `index.html` for every path.

Confirm the container actually sees an edit:

```sh
docker compose exec web grep -c somethingYouJustTyped /app/src/path/to/file.tsx
```

`docker compose restart web` resyncs the mount. The permanent fix is to run the
stack on the native Docker daemon (`docker context use default`) instead of the
Docker Desktop VM, which uses real bind mounts and has no such layer.

### Signing in locally

`MOCK_KEYCLOAK=true` is the default, so no real credentials are needed:

```
http://localhost/api/login?mock_user=alice
```

`mock_user` accepts a number, an email, a sub or a first name. The people
`backend/fixtures/dev/seed_campus.sql` sets up cover every role worth testing:

| `mock_user` | role                                        |
| ----------- | ------------------------------------------- |
| `alice`     | admin                                       |
| `bob`       | student, and on the opportunities allowlist |
| `charlie`   | Head (`boss`)                               |
| `dana`      | Executive (`capo`)                          |
| `erik`      | Member (`soldier`)                          |
| `hassan`    | student, no special access                  |

## Commands

```sh
pnpm dev            # dev server
pnpm build          # typecheck + production build
pnpm typecheck      # tsc -b --noEmit over the project references
pnpm lint           # oxlint, including type-aware rules
pnpm format         # prettier, sorts Tailwind classes
pnpm test           # node --test over src/**/*.test.ts
pnpm api:generate   # regenerate src/api/schema.d.ts from the backend
pnpm api:check      # fail if the committed schema is stale
```

## API types are generated, not written

`src/api/schema.d.ts` is generated from the backend's OpenAPI document and
committed. Nothing about a request or response is typed by hand, so a backend
change that breaks the contract fails `tsc` instead of surfacing at runtime.

Regenerate from an offline backend export:

```sh
cd ../backend
uv run python scripts/export_openapi.py --output /tmp/nuspace-openapi.json
cd ../web
OPENAPI_URL=/tmp/nuspace-openapi.json pnpm api:generate
```

`pnpm api:check` runs the same generation and fails on any diff, so drift is
caught in CI. The exporter loads `infra/.env.example` as a dummy configuration
fixture and constructs the schema without starting Postgres, Redis,
Meilisearch, RabbitMQ, GCS, or the bot.

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

## Media uploads

Bytes never pass through our API. `useMediaUpload()` (in `src/features/media/`)
runs the three-step presigned flow: ask the backend to sign one PUT per file,
send the bytes straight at the returned URL, and let the bucket tell the backend
what landed. The `x-goog-meta-*` headers are part of the signature and are
replayed exactly as issued — re-deriving `Content-Type` from the `File` is
enough for GCS to answer 403.

Two things about step three are easy to get wrong:

- **Locally the Media row already exists before the bytes do.** With
  `USE_GCS_EMULATOR=true` there is no Pub/Sub, so the backend creates the row
  while signing, and the upload URL points at its own `/bucket/local-upload`
  proxy. In production the row appears only after GCS notifies
  `POST /bucket/gcs-hook`, which happens _after_ the PUT resolves. A refetch
  immediately on success can legitimately come back without the new image, and
  only production will show you that.
- **Formats are not interchangeable, and the backend filters on them.** Events
  return `carousel` only; communities return `profile` and `banner`. Asking an
  entity for a format it never carries renders nothing, with no error — the
  generated types cannot catch it, because the value is valid either way. Go
  through `selectMedia()` in `src/features/media/select.ts`, where that mapping
  is written down.

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

## Tests

`node --test`, no test framework. Node 22+ strips TypeScript natively, so a
`.test.ts` file next to the module it covers runs with no build step and no
dependency. `tsconfig.test.json` gives those files Node's types; the app project
excludes them so app code cannot reach for `node:` builtins by accident.

There is one suite, on `features/communities/url-validation.ts`, ported from the
old app along with the module. It is the interesting kind of test: `new URL`
accepts `https://wtf://t.me/x` and reports `wtf:` as the host, so a naive
protocol check passes something that goes nowhere near Telegram.

## Linting

Oxlint, not ESLint. typescript-eslint refuses to load under TypeScript 7 and
has no supporting release yet, while oxlint parses with its own Rust parser and
its type-aware mode tracks TS 7 via `oxlint-tsgolint`.
