# Conventions

How `src/` is structured, named, split, and written. This is the checklist a
contribution should conform to before it lands. `pnpm typecheck && pnpm test &&
pnpm build` (plus `pnpm lint` and `pnpm format`) must be green at every commit.

## Source layout

```
src/
  routes/            TanStack Router file-based routes (thin)
  components/        all React UI
    routes/<route>/  the Page for one route, its nested pages, its components/
    layouts/         app shells (app, courses, public)
    shared/          cross-page reusable UI, grouped by domain
    ui/              shadcn/ui primitives on Base UI (generated, owned by shadcn)
  lib/<module>/      bounded capabilities: constants, functions, types, tests
  hooks/             reusable behavior behind use* hooks
  api/               generated OpenAPI types, client, errors, query keys
  app/               QueryClient + router bootstrap
  assets/            static files
```

The layers have a strict dependency direction. `routes/` imports from
`components/`, `lib/` and `hooks/`; `components/` never reaches into
`routes/`. `lib/` never imports React. `api/` and `lib/` never import UI.

## File naming

- **Component and module files are `kebab-case`**: `page-container.tsx`,
  `resilient-image.tsx`, `query-boundary.tsx`.
- **Compound components are a folder with an `index.tsx`**: `layouts/app/`
  holding `index.tsx` + `app-sidebar.tsx`, `routes/communities/` holding the
  Page plus a `components/` subfolder.
- **Page-editor blocks are PascalCase folders** (Puck convention):
  `shared/page-editor/blocks/Card/index.tsx`, `.../RichText/index.tsx`.
- **Route segments use `$`**: `routes/_app/communities/$slug/index.tsx`.
- **`_`-prefixed directories are private** to their parent and must not be
  imported from outside it: `shared/page-editor/blocks/_lib/`,
  `.../_shared/`.
- **A file that contains _only_ hard-coded static data is called `data.ts`**
  in its own folder: `components/routes/about/data.ts`,
  `components/shared/legal/data.ts`. If the page adds logic over that data, it
  gets a sibling file (`contacts/data.ts` + `contacts/search.ts`).
- **Tests**: a module's tests are `tests.ts` inside the module
  (`lib/communities/tests.ts`); a standalone unit under test is covered by a
  `*.test.ts` file next to it.

## Directory roles

### `src/routes/` — routing only

Every route is a folder whose `index.tsx` owns only `createFileRoute`,
`validateSearch`, `beforeLoad`, `loader`, and reads `Route.use*`. Markup lives
in the Page component under `components/routes/`; route files import it:

```tsx
import { Page } from "@/components/routes/about"
```

`_app/route.tsx` and `_public/route.tsx` are the shared layout-group route
files (auth guard, shell wiring). Search schemas live in the route file,
exported as `type XSearch = z.infer<...>`. Note: route params are NOT
`camelCased` by this TanStack version — a `$event-id` folder is read as
`params["event-id"]`.

### `src/components/routes/<route>/` — UI mirrors, no logic

A route mirror holds only its `index.tsx` `Page`, a `components/` subfolder
for page-exclusive components, nested page folders (`$slug`, `audit`,
`planner`), and the page's own static `data.ts`. No business logic lives here;
that goes in `lib/`, and the Page calls through to it.

### `src/components/layouts/` — app shells

`app/` is the authenticated shell (sidebar, `PageContainer` wrapper), plus
`courses/` and `public/` for those layout groups.

### `src/components/shared/` — cross-page UI, grouped by domain

Cohesive domains live in subfolders:

- `markdown/` — renderer, toolbar
- `theme/` — provider, toggle
- `page/` — container, header, section
- `media/` — picker, resilient-image
- `legal/` — legal-page + `data.ts`
- `query/` — boundary, infinite-list
- `page-editor/` — self-contained Puck editor; never split up

Generic primitives that belong to no group stay flat at the shared root
(`confirm-dialog`, `list-filters`, `not-found`, `toggle-chip`). A new shared
component lands in the matching subfolder or flat at root — not inside a route
mirror.

### `src/components/ui/` — shadcn primitives

Owned by shadcn and treated as vendor code: consume them, don't add
project-specific props or styles by hand. Recurring styled behavior that shadcn
does not already ship (the filter `ToggleChip`, the legal page) belongs in
`shared/`, not upstreamed into `ui/`.

### `src/lib/<module>/` — bounded capabilities

The unit of business logic. Every module has exactly the canonical files:

| file           | contents                                                          | may import                                  |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| `constants.ts` | enum-like lists, label maps, limits, zod schemas                  | nothing internal                            |
| `functions.ts` | all logic and helpers (API calls, formatting, validation)         | `./constants`, `./types`, other lib modules |
| `types.ts`     | types only (usually aliases over generated schema)                | `./constants` for `z.infer` keys            |
| `tests.ts`     | tests for the module, run via `node --test`                       | `./functions`, `./types`                    |
| `index.ts`     | barrel: `export * from "./constants"` + `./functions` + `./types` | —                                           |

Rules that keep this graph acyclic and types cheap:

- `types.ts` holds **only** types. No constants, no functions.
- Consumers import the **barrel** (`@/lib/courses/gpa`), never
  `lib/courses/gpa/something.ts`. Files inside a module may import their own
  `./constants` / `./types` directly.
- Big capabilities split into nested modules with the same shape:
  `lib/courses/` keeps `audit/`, `gpa/`, `comparison/`, `planner/` (and
  `planner/schedule/`), each with their own five files.
- `lib/utils/` holds genuinely generic helpers (`cn`, campus datetime).
  Anything domain-specific has a named module, not a home in `lib/utils/`.

### `src/hooks/` — reusable behavior

Named `use-*.ts`. Hooks shared across routes live here (`use-session`,
`use-media-upload`, `use-infinite-list`). Page-exclusive behavior stays
co-located with the Page instead.

### `src/api/` — generated, not written

`schema.d.ts` is regenerated from the backend OpenAPI document and committed
(`pnpm api:generate`, CI runs `pnpm api:check`). Requests go through
`api/client.ts` (`api`, `unwrap`, `ApiError`); keys through
`api/query-keys.ts`. The only hand-written payload shapes are the
`/me` and `/connect-tg` zod parses in `lib/user/constants.ts`, which the codegen
cannot describe.

## Code splitting

- **Logic lives in `lib/`; components render.** A page that needs a decision
  or a computation imports a function from `lib/` and calls it.
- **One capability, one module.** When a module outgrows its five files, split
  into nested modules rather than introducing a second top-level folder.
- **Page-exclusive helpers co-locate** with the Page (`contacts/search.ts`)
  instead of pretending to be shared logic.
- **Static content stays content**: `data.ts` next to its consumer, not in
  `lib/`.
- **Hooks for behavior, lib for logic.** Shared _stateful_ behavior is a hook;
  shared _pure_ logic is a lib function. Neither is a component prop threading
  exercise.

## Writing style

### TypeScript

- `strict`, `noUnusedLocals`, `noUnusedParameters` are on.
- **`verbatimModuleSyntax`** — import types with `import type`; for mixed
  imports use inline `type` markers: `import { fn, type T } from "..."`.
- **`erasableSyntaxOnly`** — no `enum`, no `namespace`, no constructor
  parameter properties. Use `as const` objects plus the derived union
  (`USER_ROLES` + `(typeof USER_ROLES)[number]`).
- Types are derived from the generated schema first (`z.infer` / `components`),
  hand-written only in the documented exceptions.

### Formatting

Prettier with no semicolons, double quotes, width 80, and the Tailwind plugin
that sorts utility classes. `pnpm format` runs it.

### Styling

- Use `cn()` (from `@/lib/utils`) for conditional classes. The `ui/`
  primitives keep their own `cn` from the `cn` package — leave them as
  generated.
- **Design tokens, not palette classes**: `bg-muted`, `text-foreground`,
  `border-border`. Tokens already handle dark mode; raw `bg-gray-100` needs a
  hand-written `dark:` variant everywhere and drifts.
- **Never build Tailwind classes by interpolation** (`` `grid-cols-${n}` ``) —
  the scanner cannot see it and the class silently disappears from the build.

### Imports

Grouped by blank line: React/lucide/external packages first, then internal
`@/` imports (`@/api` → `@/lib` → `@/hooks` → `@/components/*`), then relative
imports, with type imports last.

### Comments

JSDoc that explains _why_ — the rule the code encodes, the backend contract it
mirrors, the bug it dodges — rather than restating the code. Module-level
comment blocks are used for cross-cutting rationale (e.g. `lib/media`'s
presigned upload notes, `utils`'s campus-time explanation). Old-app history
belongs in these comments too: it is why the code exists.

## API and data conventions

- **Error surfaces**: `QueryBoundary` (loading / error / empty) in
  `shared/query/boundary.tsx`; `apiErrorMessage()` in `api/errors.ts` decides
  what is safe to show a user (never a 5xx `detail`).
- **Datetimes** cross the API boundary in `lib/utils` — the backend reads naive
  datetimes as Almaty local time, so formatting and conversion happen in exactly
  one file.
- **Query invalidation** targets subtrees through `qk` keys
  (`@/api/query-keys`); there is one `QueryClient` in `src/app/query-client.ts`.
- **Permissions** come from a hook, never inline role arithmetic.
- **Media** uses the three-step presigned flow via `use-media-upload` +
  `lib/media` (`selectMedia` maps formats, `assertValidImageBatch` guards
  uploads); bytes never pass through our API.

## Tests

`node --test`, no test framework. Node 22+ strips TypeScript natively, so a
`tests.ts` / `*.test.ts` file runs with no build step. `scripts/test-imports.mjs`
resolves the `@/` alias (file or folder `index.ts`) and extensionless relative
imports. `tsconfig.test.json` gives tests Node types; the app project excludes
them so app code cannot reach for `node:` builtins.

Prefer seeding a module's `tests.ts` with pure functions worth pinning down
Unicode normalization, regex wobble, presentation formatting — the interesting
bugs.

## Commands

```sh
pnpm typecheck   # tsc -b --noEmit
pnpm test        # node --test src/**/*.test.ts + src/**/tests.ts
pnpm build       # typecheck + vite build
pnpm lint        # oxlint --type-aware
pnpm format      # prettier (sorts Tailwind classes)
pnpm api:generate / pnpm api:check
```

Anything structural — a new module, a rename, a move — should also be verified
with `pnpm build` so the router's generated `routeTree.gen.ts` lands in sync.
