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

- **Component and module files are `kebab-case`**: `route-tabs.tsx`,
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

`app/` is the authenticated shell (sidebar and the one place horizontal padding
lives), plus `courses/` and `public/` for those layout groups.

### `src/components/shared/` — cross-page UI, grouped by domain

Cohesive domains live in subfolders:

- `markdown/` — renderer, toolbar
- `theme/` — provider, toggle
- `page/` — `index.tsx` (the `Page` box), `header.tsx`, `card-grid.tsx`
- `media/` — picker, resilient-image
- `legal/` — legal-page + `data.ts`
- `query/` — boundary, infinite-list
- `table/` — pagination, page-range
- `data-table/` — the `DataTable` box, its sortable header, its toolbar
- `page-editor/` — self-contained Puck editor; never split up

Generic primitives that belong to no group stay flat at the shared root
(`confirm-dialog`, `list-filters`, `not-found`, `route-tabs`, `toggle-chip`). A
new shared component lands in the matching subfolder or flat at root — not
inside a route mirror.

### `src/components/ui/` — shadcn primitives

Owned by shadcn and treated as vendor code: consume them, don't add
project-specific props or styles by hand. Recurring styled behavior that shadcn
does not already ship belongs in `shared/`, never upstreamed into `ui/` — the
`ToggleChip`, the filter `FilterTabs`, `SearchFilter` and `MultiFilter`, and the
legal page are all `shared/`. Two ways of rendering the same thing is the signal
that the primitive is wrong: the old `tabs-nav.tsx` and `FilterTabs` were the
same tab strip written twice, so `tabs-nav` is gone and `route-tabs` is the only
one.

## Page layout

Every page is a `Page` from `shared/page`. The whole standard is one box, one
header, one body:

```
<div className="mx-auto w-full max-w-7xl">   the box — always
  <PageHeader …/>                             the title, spanning the box
                                             (optional `media` at its left)
  <div className="mt-6 space-y-6 max-w-3xl?">  the body
```

`PageHeader` takes an optional `media` node, drawn to the left of the title block
and vertically centred against it — the pattern is an `Avatar` in the header of
`/account`. It is the caller's own node rather than a variant, because the
alternative is a fixed-size media box for the caller to fill, and that is how
`/account` ended up with a `size-12` image inside a `size-10` clipper: the image
was larger than the thing cropping it, so the round mask never read. `Avatar` is
already round and sizes to its own content, so nothing needs a size override.

- **The box is always `max-w-7xl`.** There is no per-page box width. Pages used
  to ship their own `mx-auto max-w-*`, so two pages of the same kind had
  different left edges.
- **Exactly two body widths**, chosen per page and never invented: `wide`
  (uncapped — lists and grids you scan) and `prose` (`max-w-3xl` — pages you
  read). The body is capped, the box is not.
- **A `prose` page centres its column**, header included — capping the body
  without centring it left the text hugging the left edge of a 7xl box with a
  void beside it, and centring only the body left the title hanging off to the
  left of its own text. A `wide` page's body fills the box, so there is nothing
  to centre.
- **The gap below the header is `Page`'s job**, not the page's.
- **A page never sets padding.** `layouts/app` and `layouts/public` own it, so a
  page cannot end up padded twice. Nor does a page set a box width.
- **Page-header action buttons are default size** — `Button`'s default is
  `h-8`, matching `TabsList`, so the header and the tab bar under it line up.
- Omit `title` only when the page brings its own heading (the landing hero).

Which width a page gets is not a per-page judgement call. The assignment:

| `wide` (body uncapped)                                                   | `prose` (body `max-w-3xl`)                                     |
| -------------------------------------------------------------------------| ---------------------------------------------------------------|
| `/account`, `/p/$slug/settings/admin-controls`                           |                                                                |
| `/events`, `/events/$eventId`                                            | `/opportunities`                                               |
| `/communities`                                                           | `/contacts`                                                    |
| `/announcements`                                                         | `/sgotinish`, `/degree-audit-info`                             |
| `/courses`, `/courses/statistics`, `/courses/schedule`, `/courses/audit` | `/communities/$slug/settings` + `/general` + `/admin-controls` |
| `/about`, `/` (public)                                                   | `/privacy-policy`, `/terms-of-service` (public)                |

**A page hosting a datatable is `wide`.** Not a preference: `prose` centres the
body in `max-w-3xl`, and six columns of page data do not fit in a 48rem column,
so the table scrolls sideways or — worse — the columns compress until the name
and the slug are both ellipses. This is why `/account` and
`/p/$slug/settings/admin-controls` are `wide` despite being settings-shaped.

Two routes are deliberately outside this: community detail
(`/communities/$slug`) and the page editor bypass the app shell entirely for
their full-bleed canvas. Leave them alone.

Route-level tab strips are `shared/route-tabs`; a page that filters itself
reuses the same `ui/tabs` primitives through `FilterTabs` instead of hand-rolled
chips. Filter rows sit directly in the page body — there is no filter box.

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

**`useDataTable` is here, not beside the component it configures.** It is the
only hook in the app that belongs to a component — `DataTable` renders whatever
table it is handed and never calls it. The rule that decides it is the one
above: shared *stateful behavior* lives in `hooks/`, and this is shared stateful
behavior. Putting it in `components/shared/data-table/` would have looked right
and been wrong, because the next developer would assume a component in that
folder is rendered by a parent rather than called by one.

### Tables

`DataTable` (`shared/data-table/`) is the box, `useDataTable` the config, and
`TablePagination` (`shared/table/`) the footer. Three rules the two tables that
use them established:

- **Page, size, sort and order are URL state, not component state.** They come
  from the route's `validateSearch`, and the `size` a component shows is the one
  that route accepts. No `PAGE_SIZE` literal in a component: the allowed values
  live in that module's `constants.ts` (`PAGE_SIZES`, `DEFAULT_PAGE_SIZE`), and
  a list in a component is a second source of truth for a rule the server
  already enforces. The same shape applies to a sort whitelist, a filter option
  list, and a badge's copy — one list, derived everywhere.
- **Server-side means `manualPagination` and `manualSorting` on.** The hook
  receives one page; letting react-table sort or page the array it was given
  reorders one page of the result and leaves the rest in the server's order.
  Consequently `sorting` is controlled and `onSortingChange` is **required** —
  without it the header chevrons render, look right, and do nothing.
- **`overflow-x-auto` needs `overflow-y-hidden` beside it.** `overflow-x: auto`
  forces `overflow-y: visible` to compute to `auto`, so any child that overflows
  vertically — a `TabsTrigger`'s 5px active bar, a focus ring — becomes a real
  vertical scrollbar. It is not an overflow bug in the child; it is the
  shorthand's interaction.

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
