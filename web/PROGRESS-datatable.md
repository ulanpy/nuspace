# PROGRESS — Pages datatables: sorting, filtering, page size

This file is the **single source of truth for this piece of work**. It is written
to be handed to an AI agent with a fresh context. Read the whole thing before
touching code, then work the checkboxes in order.

It is a **sibling** of `web/PROGRESS.md`, not a replacement. That file is the
live "Unify Communities + User Pages into `Pages`" plan and is mid-flight. Do
not edit it from here.

---

## Read this first: Phase 1 reverses `b176a18`

`b176a18 refactor(pages): two endpoints, and drop the Owned/Admin tabs` removed
the `role` filter and the visibility clause from `/pages/mine`. **This plan puts
both back.** That is a deliberate product decision, not an oversight, and it was
taken with the reasoning below in hand.

**Do not "fix" Phase 1 back toward `b176a18`.** In particular, the docstring at
`api.py:84-88` and the `_list_conditions` docstring at `repository.py:118-134`
both currently argue _against_ a `role` filter. Phase 1 tells you to rewrite
them. When you do, **keep the history in the replacement text** — do not delete
it. Those docstrings are the only thing stopping the next agent from repeating
the loop.

The three bugs that decision fixed, in case the reversal reintroduces one:

1. **The visibility OR inside `mine` contained `owner = me`.** So
   `role=admin` compiled to `(visible OR administered-by-me)`, and `visible`
   already meant "or owned by me" — every owned page came back under both tabs
   and appeared twice. This is why 1.7 insists the `NOT owner` clause is in the
   first commit rather than added after a bug report.
2. **`include_private` as a flag on a shared endpoint.** It was the thing that
   broke, not the fix.
3. **`owner_sub` as a derived param** — a visibility alternative smuggled into a
   relationship query.

If the reversal turns out to be wrong, the failure mode to watch for is **row
duplication across the role filter**, not a crash. Write the disjointness test
(1.15) first and run it before the UI work.

The user has since asked for Owned/Admin filtering, so this is settled. Do not
re-open it; do not use it as a reason to simplify Phase 1 away.

## How to use this file

1. Read this file end to end.
2. Run `git status` and `git log --oneline -10`. Reconcile reality with the
   Progress log below — code wins over the log.
3. Run the [Phase 0 pre-flight](#phase-0--pre-flight-dependency-check) and stop
   if it fails.
4. Find the **first unchecked box**. That is your next task. Do not skip ahead.
5. Do exactly that task. Do not "while I'm here" anything outside the box.
6. Verify with the gate commands in [Gate](#gate). If the gate is red, fix it
   before ticking the box.
7. Tick the box. Append one line to the [Progress log](#progress-log).
8. Repeat until Phase 10 is done.

**Never `git commit`, `git push`, or deploy without being asked to.** The user
commits. The agent does the work and reports.

---

## Ground truth for this plan

Two facts shape everything below. They were verified by reading the code; if
something looks wrong, re-check rather than trusting the line numbers.

1. **`@tanstack/react-table` is not in `web/package.json`, and
   `web/src/components/ui/table.tsx` does not exist.** There is no datatable
   anywhere in the repo — zero hits for `useReactTable`, `ColumnDef`,
   `columnHelper`, `flexRender`, `getCoreRowModel`. The pages tables are
   hand-rolled `Item` lists over one page of a server response.
2. **Neither list endpoint can sort or filter by ownership or visibility** —
   only `page`, `size`, `keyword`, `exclude_sub`. Phase 1 exists because of
   this. Client-side sorting would only ever sort the current page, which is
   worse than not sorting at all.

The Context7 reference the user offered
(`context7.com/sadmann7/shadcn-table/llms.txt`) is Next.js / Drizzle /
server-actions shaped. Only its `useDataTable` + `DataTable` +
`DataTableColumnHeader` + `DataTablePagination` layer transfers. Here paging and
sorting are URL + react-query driven, not server-component driven.

---

## Phase 0 — Pre-flight (dependency check)

This work rewrites the very files the Pages refactor's Phase 4 was moving. Do
not race it.

- [x] Read `web/PROGRESS.md` and check where its Phase 4 stands.
- [x] **If its Phase 4 is still open, stop and say so.** The two plans touch
      `routes/_app/account/index.tsx`, `routes/_app/p/$slug/settings/admin-controls/index.tsx`,
      `components/routes/account/components/my-pages.tsx`,
      `components/routes/pages/settings/components/admins-table.tsx` and others.
      Two agents in one worktree over the same files is how lines get lost.
      **Closed: every Phase 4 box is ticked.** Phases 5 (docs), 6 (prod push)
      and 7 (deferred) are open and stay that way — 6 is a deploy and 7 says
      "not this PR". See the note on Phase 5 overlap below.
- [x] Confirm `web/PROGRESS.md` has no unchecked box under its Phase 6 (prod)
      or Phase 7 (deferred cleanup) that this work would pre-empt. Phase 7 is
      explicitly "not this PR" and stays out of scope either way.
- [x] Bring up the stack and confirm a green baseline before changing anything:
      backend up, `pnpm build` passes, backend pytest passes. Record the numbers
      in the Progress log.
- [x] Record the two known baselines so later runs can tell drift from
      regression: backend ruff ≈ **11** errors, web lint ≈ **8–9** (see the
      other file's log for the current figures).

### Phase 0 findings — four things were red at HEAD, and none of them were mine

1. **The `fastapi` container had not booted in two days.**
   `ModuleNotFoundError: No module named 'openai'`, so nothing behind nginx
   answered and **`pnpm api:check` could not run at all**. The image was built
   Sep 27; `openai-agents` landed in `f1e9c29` on Sep 29. `infra/docker-compose.yml:34`
   keeps a `fastapi-venv` volume "to preserve the image venv (bind mount hides
   it otherwise)" — which is exactly how it goes stale in silence. Fixed with
   `docker exec -w /nuros/backend fastapi uv sync --frozen` + restart; the volume
   is now correct and the fix is not a repo change. **If the backend is
   unhealthy at any point in this work, check this before anything else.**
2. **`schema.d.ts` was 434 lines behind**, from the same commit — the whole
   `agent` module (`/agent/page-drafts` and friends). Regenerated; nothing in
   it touches pages, and typecheck/build/83 tests stay green on it.
3. **ruff was 16, not ≈11.** The extra 5 were all in `modules/pages/` — four
   unused imports in `test_list_pages.py` and `Literal` in `api.py` — i.e. in
   the directory this work owns, left by the previous plan's second pass. Fixed
   mechanically (`ruff check --fix` + `black`), which is what brings the count
   to the documented **11**. Those 11 are in `bootstrap/gcp.py`, a migration,
   `modules/events/schemas.py` and `courses/degree_audit/` — all untouched here,
   and left alone.
4. **`black --check` was red** on `modules/pages/repository.py` and
   `test_list_pages.py` — also the previous plan's. Both reflows are cosmetic.

Two of these are the same lesson the other plan's log keeps repeating, so it is
worth naming: **a green suite says the code you touched is correct, not that
the tree is green.** Both failures here were invisible to 209 passing tests,
and one of them was invisible to `pnpm typecheck` too.

**One overlap, flagged not resolved.** `web/PROGRESS.md` Phase 5 (docs, open)
and this file's Phase 10 both edit `web/CONVENTIONS.md`. They touch different
sections — Phase 5 is the route table, the `shared/pages/` group and the two
READMEs; Phase 10 is the shared-domains list, the `wide` assignment and six new
rules. Do them in this order, or Phase 5 first and re-read the file before
Phase 10.

---

## Gate

Must be green at every commit (this is the repo's own rule, from
`web/CONVENTIONS.md` and `CONTRIBUTING.md`).

```sh
# web
cd web
pnpm api:check      # schema.d.ts matches the backend OpenAPI doc
pnpm typecheck      # tsc -b --noEmit
pnpm test           # node --test, no framework
pnpm build          # typecheck + vite build; also regenerates routeTree.gen.ts
pnpm lint           # oxlint --type-aware
pnpm format         # prettier, sorts Tailwind classes

# backend
cd backend
uv run ruff check .
uv run black --check .
PYTHONPATH="$(dirname "$PWD")" uv run python -c "
from dotenv import load_dotenv
load_dotenv('../infra/.env')
import pytest, sys
sys.exit(pytest.main(['-q']))"
```

Notes:

- `pnpm api:generate` / `api:check` need a **running backend**. From inside the
  `web` container, `localhost` is Vite — use
  `OPENAPI_URL=http://nginx/api/openapi.json`.
- Backend tests run under **pytest strict mode**. No `conftest.py` exists, so
  every async test needs an explicit `@pytest.mark.asyncio`.
- There is a known pre-existing baseline of ~11 ruff errors. Do not fix them
  here; do not add new ones.
- `web/src/api/schema.d.ts` is **generated**. If you cannot bring a backend up,
  **stop and say so** rather than hand-editing it.
- CI (`.github/workflows/deploy.yml`) has **no test job**. The gate above is the
  only gate. Run it yourself.
- `pnpm format` also sorts Tailwind classes, so run it **last** to keep class
  order stable in the diff.

## House rules that are easy to break

- Read `web/CONVENTIONS.md` before writing web code. It is binding. Phase 10
  amends it.
- `lib/<module>/` has exactly `constants.ts` (limits, enums, zod), `functions.ts`
  (all logic), `types.ts` (types only), `tests.ts`, `index.ts` (barrel).
  Consumers import the barrel, never a file inside it. A new
  `shared/data-table/use-data-table.ts` would break this — it goes in
  `src/hooks/`, because `CONVENTIONS.md:179-183` puts shared _stateful_ behavior
  in `src/hooks/`.
- `components/ui/` is shadcn vendor code. Consume it; do not hand-edit it. If a
  primitive does not fit, build the thing in `shared/`. This is also why 9.3
  says to leave 39 unused primitives alone.
- **This is Base UI, not Radix.** Every `ui/` primitive is on `@base-ui/react`,
  and `Checkbox` is `checked` / `onCheckedChange`, not `checked` / `onChange`.
  A Radix datatable recipe will not compile here.
- No `enum` / `namespace` (erasableSyntaxOnly). Use `as const` + derived union.
- `verbatimModuleSyntax`: `import { fn, type T } from "..."`.
- Design tokens only (`bg-muted`, `text-foreground`), never raw palette classes.
- Never build a Tailwind class by interpolation — `` `grid-cols-${n}` `` is
  invisible to the scanner and the class vanishes from the build.
- `noUnusedLocals` / `noUnusedParameters` are on, so every new import must be
  used.
- `cn` is imported two ways: 41 `ui/` files use `import { cn } from "cn"`, 47
  app files use `@/lib/utils`. Leave the generated ones alone.

---

## Target shape (all decisions are settled — do not re-litigate)

| Decision                | Value                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Datatable library       | `@tanstack/react-table` + shadcn `table` via `pnpm exec shadcn add table`                       |
| Paging / sorting        | **Server-side**, driven by route `validateSearch`. Never client-side over one page.             |
| Rows per page           | 10 / 20 / 30 / 40 / 50, default 10, on **all three** paginated lists                            |
| Where the size lives    | Route `validateSearch`, values from that module's `constants.ts` — no `PAGE_SIZE` in components |
| My Pages columns        | `logo \| name (link) \| slug \| role \| visibility \| actions`                                  |
| My Pages checkboxes     | **none**, and **no bulk delete**                                                                |
| My Pages role filter    | `All roles` / `Owned by me` / `Where I'm an admin`                                              |
| Admins columns          | `checkbox \| avatar \| name \| role \| actions`                                                 |
| Admins selection        | bulk `Remove`; `Make owner` **only when exactly one row is selected**                           |
| Pinned rows             | "You" and "Owner", carried as react-table rows with `meta.pinned`                               |
| Sortable pages columns  | `name`, `visibility`, `created_at`. **`slug` is not sortable.**                                 |
| Sortable admins columns | `name`, `created_at`                                                                            |
| Page header media       | new `Page`/`PageHeader` `media` prop; avatar on `/account`                                      |
| Page widths             | `/account` and `/settings/admin-controls` → `width="wide"`                                      |
| Sidebar                 | `/mynuspace` moved to first, `UserIcon` → `GlobeIcon`. **Labels unchanged.**                    |
| `ui/` primitives        | all 39 unused ones **kept** — vendor code                                                       |
| My Pages search box     | **none** — see the Meilisearch trap in Phase 1                                                  |
| Column-visibility menu  | **none**. If columns crowd, `hidden lg:table-cell` on `slug` / `visibility`.                    |
| Reset-filters button    | **none** — each `MultiFilter` clears itself                                                     |

### The one semantic decision worth stating twice

`role=admin` means **administered by the viewer AND NOT owned by them**. It is
disjoint from `role=owner`.

This is not a preference. `repository.py:_list_conditions` carries a docstring
recalling that a previous `role` implementation leaked pages the viewer both
owned and administered into _both_ buckets, and the fix was to delete the filter
entirely. We are re-adding the filter, so the `NOT owner` clause must be there
from the first commit. A page you own _and_ administer belongs under `Owner`
only.

---

## Phase 1 — Backend: `role`, `visibility`, `sort`

The gate for everything else. Do not start the web work until this is green.

**This phase reverses `b176a18`.** Read
[Read this first](#read-this-first-phase-1-reverses-b176a18) before touching it.
The `role=admin` disjointness test (1.15) is the first thing to write, not the
last.

- [x] 1.1 `backend/modules/pages/api.py:69-89` (`get_my_pages`) — add
      `role: Literal["owner", "admin"] | None = None`,
      `visibility: list[PageVisibility] | None = None`,
      `sort: str | None = None`, `order: Literal["asc", "desc"] = "desc"`.
      Forward all four to the service. Match the existing param style in the
      file (`size: int = Query(20, ge=1, le=100)` — note `size` already allows
      100, so the 10–50 range needs **no** backend change).
- [x] 1.2 `backend/modules/pages/api.py:179-` (`get_page_admins`) — add
      `sort` / `order` only. **No** `role`, and **no** `visibility`: the owner is
      not in the admins list at all, so "owner vs admin" is a column there, not
      a filter.
- [x] 1.3 `backend/modules/pages/service.py:205-` (`list_my_pages`) — accept and
      forward the new kwargs. **Rewrite the docstring at `:221-228`**, which
      currently argues at length that there is deliberately no `role` filter.
- [x] 1.4 `backend/modules/pages/service.py:450-` (`list_admins`) — accept and
      forward `sort` / `order`.
- [x] 1.5 `backend/modules/pages/repository.py:108-` (`_list_conditions`) — add
      the two filters to the `scope == "mine"` branch **only**, as separate
      `AND` conditions appended to the returned list. Never fold them into the
      `or_()`. Visibility and role combine with AND, so
      `?role=admin&visibility=private` is an intersection.
- [x] 1.6 The count query at `:216-219` reuses `*conditions`, so totals and
      `has_next` come out correct for free. **Do not add a second where-clause**
      and do not "fix" the count separately.
- [x] 1.7 **`role=admin` is disjoint**: administered-by-me **AND NOT**
      owner-is-me. See the callout above. Without the `NOT owner`, a page you own
      _and_ administer appears under both Role options — the exact bug
      `b176a18` was written to end, and the one most likely to come back.
- [x] 1.8 **Rewrite the `_list_conditions` docstring at `:118-134`.** It says
      "`mine` has no visibility filter at all" and explains the old leak. Both
      become false. **Preserve the history**: the replacement must still explain
      why a `role` filter is dangerous here and what specifically went wrong,
      because the new filter is the thing that docstring warns about. A reader
      who only sees the new text should come away knowing the constraint (1.7),
      not concluding the filter is safe to widen.
- [x] 1.9 **Rewrite the `api.py:84-88` docstring** for the same reason. That is
      the second of the three; the third is 1.3. Same instruction: replace the
      "No `role` parameter" paragraph, do not just delete it.
- [x] 1.10 `repository.py:151-` (`list_pages`) — `sort` is **`None` by default
      and the existing order chain is then left completely untouched**:
      `owner-first DESC, has_media DESC, name ASC` (`:206-211`). Defaulting
      `sort` to `created_at` would silently reorder the list people see today,
      with no diff to show for it. When `sort` _is_ given it replaces the whole
      chain, including dropping the owner-first prefix — prefixing it would make
      "sort by name" owner-grouped, which is not a name sort.
- [x] 1.11 Sort columns go through a **whitelist dict**, never an interpolated
      column name — the same discipline as the existing keyword
      `order_clause` at `:189-194`. Pages: `name`, `created_at`, `visibility`.
      Unknown value → 422.
- [x] 1.12 `repository.py:241-` (`list_admins_page`) — same treatment. Keep
      `PageAdmin.user_sub.asc()` as the final tiebreaker; the comment there
      explains that `created_at` alone is not a stable sort and offset paging
      over a non-deterministic order drops and repeats rows across page
      boundaries.
- [x] 1.13 Document the visibility sort order. `models/page.py:23-` declares
      the enum `private, internal, public` and `:42` stores it as `SQLEnum`, so
      `ORDER BY visibility` ascending is **narrowest → broadest**, not
      alphabetical. That is a useful ladder; note it so nobody "fixes" it into
      `public` first.
- [x] 1.14 **The Meilisearch trap.** `repository.py:165-177` short-circuits to
      Meilisearch whenever `keyword` is set, with `filters=None` (`:172`) and a
      relevance `case()` for ordering (`:190-194`). So `sort` and `visibility`
      are **silently ignored on the keyword path** — no error, just wrong
      results. My Pages has no search box (see the decisions table), so this is
      unreachable today. Leave a comment at both the api param and the repository
      branch recording why, so whoever adds a search box later knows the filters
      need index facet config in `search_indexes.py` plus a reindex.
      Silently-ignored params are how you get a bug report that says "the sort
      button does nothing".
- [x] 1.15 Tests in `backend/modules/pages/tests/`: - [x] `test_list_pages.py` — `role=owner` excludes administered-not-owned
      and vice versa; a page owned _and_ administered appears under
      `owner` only, never under `admin`. - [x] `test_list_pages.py` — `visibility` narrows, and combines with `role`
      by AND. - [x] `test_list_pages.py` — each sort column, both orders; `sort` absent
      preserves the existing chain exactly. - [x] `test_list_pages.py` — an unknown `sort` value is rejected. - [x] `test_list_admins_pagination.py` — `sort=name` stays stable across a
      page boundary (the tiebreaker concern the existing tests already
      cover for `created_at`). - [x] `test_page_visibility.py` — the new `visibility` filter does not
      change the `browsable` scope.

---

### Phase 1 — what reality added

**1. The sort whitelist is an enum, not a string plus a dict.** The plan asked
for a whitelist dict and a 422 on an unknown value, which is two mechanisms.
`PageSort` / `PageAdminSort` are `PyEnum`s, so FastAPI rejects an unknown value
with a 422 before the repository sees it, the OpenAPI doc lists the valid ones,
and `_PAGE_SORT_COLUMNS` is keyed by the same members — so the accepted value
and the ordered column cannot drift apart.
`test_the_whitelist_covers_exactly_the_accepted_values` pins the two halves.
The alternative is a dict lookup raising `KeyError` inside a coroutine, which
surfaces as an unhandled 500 rather than the 422 the caller was promised.
Verified live: `?sort=nonsense`, `?role=nonsense` and `?visibility=nonsense` on
`/pages/mine` all return 422.

**2. `!=` was the wrong operator and would have shipped a silent hole.**
`pages.owner` is nullable (`ON DELETE SET NULL`), and `owner != me` is NULL for
an ownerless page — and NULL is not true — so plain `!=` would hide a page the
caller genuinely _administers_ from `Where I'm an admin`. `IS DISTINCT FROM`
says "not you" for NULL, which is what "NOT owned by me" means. Caught while
writing the test, not by a bug report; it is the reason the clause is a
documented `is_distinct_from` and not a `!=`.

**3. The order chains became methods, and that was not in the plan.** 1.15
asked for "each sort column, both orders; `sort` absent preserves the existing
chain exactly" — which is untestable while the chains are inline in
`list_pages` and `list_admins_page`. `_page_order_clauses` and
`_admin_order_clauses` now exist as classmethods, exactly like
`_list_conditions`, and the tests call the real thing. The first draft of the
admins sort test re-implemented the chain — **the one mistake this file's
docstring exists to prevent**, written into the file whose whole argument is
"a test that restates the query proves a copy matched a copy". Caught on
re-read, rewritten to call the method.

**4. A `pages.id` tiebreaker on the sorted path.** 1.12 insists on
`PageAdmin.user_sub` as a tiebreaker for offset paging over a
non-deterministic order. The same argument applies to `name` and `created_at`
on the pages list, and an explicit `sort` is a _new_ order chain, so the hole
would be one this phase introduced. `Page.id ASC` last, `sort is None` only.

**5. `test_page_visibility.py` needed a SQLAlchemy trap fixed.** The obvious
assertion — `_list_conditions(..., visibility=x) == _list_conditions(...)` —
is silently wrong: on a SQLAlchemy clause `==` **builds a comparison
expression**, so two identical WHEREs report themselves unequal and two
different ones build a query nobody runs. It fails, so it is not dangerous, but
the reason is not obvious. Compiled with `literal_binds` and compared as text,
like `_where` does. Same trap applies to the `_ADMIN_SORT_COLUMNS` comparison I
first wrote in the admins test.

Gate: **237 backend tests** (was 209 — 28 new), ruff **11** = baseline, black
clean. Live: `/pages/mine` advertises `role`, `visibility`, `sort`, `order`;
`/pages/{slug}/admins` advertises `sort`, `order` and deliberately not the
other two.

**The disjointness tests are confirmed red**, not just green. Three
experiments, each reverting after: `!=` instead of `is_distinct_from` → 3
failures; the `NOT owner` clause deleted outright (i.e. `b176a18`'s bug) → 4
failures. A test that cannot fail is a comment.

---

## Phase 2 — Regenerate the client schema

- [x] 2.1 `cd web && pnpm api:generate`. Commits `web/src/api/schema.d.ts`.
- [x] 2.2 `web/src/api/query-keys.ts` — widen the two keys so a filter change
      cannot be served from a stale cache. A key that omits a param is the
      subtlest version of this bug: the UI looks broken only for users who
      navigated in a particular order. - [x] `:32` → `mine(page, size, role, visibility, sort, order)` - [x] `:41-42` → `admins(slug, page, size, excludeSub, sort, order)`
- [x] 2.3 `cd web && pnpm api:check` must pass.

---

## Phase 3 — The DataTable layer

- [x] 3.1 `cd web && pnpm add @tanstack/react-table` — **pinned to `^8`
      (8.21.3), not latest.** 3.3–3.5 name v8's API (`useReactTable`,
      `manualPagination`, `manualSorting`, `getRowId`, `flexRender`), and v9
      is a rewrite around `useTable` + feature flags. See findings below.
- [x] 3.2 `cd web && pnpm exec shadcn add table` → generates
      `web/src/components/ui/table.tsx`. **Do not hand-edit it.** `components.json`
      pins `"style": "base-nova"` and Base UI, so it will match its siblings.
- [x] 3.3 `web/src/hooks/use-data-table.ts` — **in `hooks/`, not
      `components/shared/data-table/`** (see House rules). `manualPagination` +
      `manualSorting` over the current page of rows; `getRowId` supplied by the
      caller. **No row filtering** — that is the backend's job now, and
      duplicating it client-side is how the two drift.
- [x] 3.4 `web/src/components/shared/data-table/data-table.tsx` —
      `DataTable` (`Table` / `TableHeader` / `TableBody` / `TableRow` /
      `TableCell` + an empty row) and `DataTableSkeleton`.
- [x] 3.5 `web/src/components/shared/data-table/data-table-column-header.tsx` —
      sortable header button on `column.getToggleSortingHandler()`.
- [x] 3.6 `web/src/components/shared/data-table/data-table-toolbar.tsx` — a slot
      row for the filters plus the selection-action bar.
- [x] 3.7 `web/src/components/shared/table/pagination.tsx` — **extend, do not
      replace.** Add `pageSize` + `onPageSizeChange` and a `Select` of
      10/20/30/40/50 next to the existing chevrons. `pageRangeSummary` and
      `page-range.test.ts` are untouched.
- [x] 3.8 **Skipped on purpose:** `DataTableSortList`. The header chevron already
      shows the one active sort, and the backend has exactly one sort key. The
      chip row would be ink for a capability that does not exist.

### Phase 3 — what reality added

**`pnpm add @tanstack/react-table` installs 9.2.4, and 3.3 does not compile
against it.** Box 3.1 as written says "latest", but every API name the rest of
this phase names is v8's. v9 renamed the hook (`useTable`, not `useReactTable`),
made the feature set a type parameter (`TFeatures extends TableFeatures`),
replaced `flexRender(...)` calls with a `<table.FlexRender />` component, and
moved row/column accessors. `ColumnDef` no longer satisfies the data generic on
its own. Keeping 9.x would mean rewriting 3.3, 3.4 and 3.5 — i.e. re-litigating
a decision this file says is settled — so the dependency is pinned `^8`.

**`DataTableColumnHeader` does not carry `aria-sort`, and that is deliberate.**
`aria-sort` belongs to the `columnheader` role, which is the `<th>`, not the
button inside it. `DataTable` sets it on `TableHead` from
`column.getIsSorted()`. The three states are genuinely different values
(`false` / `"asc"` / `"desc"`), so they are mapped rather than collapsed into
one truthy check.

**Two new lint errors had to be scoped out in `vite.config.ts`, not suppressed
inline.** The repo has no disable comments, and its precedent for this is a
scoped `overrides` block with a comment:

1. `shadcn add table` emits `[&:has([role=checkbox])]:pr-0`, which trips
   `better-tailwindcss/enforce-canonical-classes` (an `error` on all of
   `src/**`). 3.2 says the generated file is not to be hand-edited, and
   canonicalising it would just have the next `shadcn add` reintroduce the
   error — so the rule joins the two the `ui/**` block already switches off.
2. `react/incompatible-library` fires on `useReactTable`, which returns
   unmemoizable functions. React Compiler is not enabled in `build` and nothing
   memoizes the table, so there is no stale-UI path open today. Scoped to the
   hook and `shared/data-table/`.

**No test was added, and none should be — yet.** Every existing web test is a
pure-function test (`page-range.test.ts`, `template.test.ts`, `sanitize.test.ts`,
`root-style.test.ts`); there is no DOM, no jsdom and no testing-library, so
rendering is deliberately untested in this repo. Phase 3 adds no pure function,
so there is nothing to assert on that conforms to the convention. The first
genuine test lands in Phase 5/6, where the route's `sort`/`order` params have to
become a react-table `SortingState` — that mapping is the piece worth pinning
down, and it will have to be a pure function to be testable at all.

---

## Phase 4 — Ownership & visibility: one source of truth

Replaces `item.owner === me.sub` (`my-pages.tsx:112`),
`page.owner_user?.sub === me.sub` (`admin-controls/index.tsx:24`) and the
`pinnedSelf` inference (`admin-controls/index.tsx:33-34`).

- [x] 4.1 `web/src/lib/pages/types.ts` — add `PageOwnership = "owner" | "admin"`,
      and **derive** `PageVisibilityValue` from
      `components["schemas"]["PageVisibility"]` instead of the hand-written union
      at `shared/pages/visibilities.ts:1`.
- [x] 4.2 `web/src/lib/pages/constants.ts` — `PAGE_OWNERSHIP` label map,
      `PAGE_OWNERSHIP_FILTERS` (all / owner / admin), `PAGE_VISIBILITIES` as a
      `as const` tuple, `PAGE_VISIBILITY_FILTERS`, `PAGE_SIZES = [10,20,30,40,50]`,
      `DEFAULT_PAGE_SIZE = 10`. The tuple is the runtime list the zod enum needs;
      the _type_ still derives from the generated schema per
      `CONVENTIONS.md:218-219`. This is the third place visibility values appear
      (see 8.12) and must be the last.
- [x] 4.3 `web/src/lib/pages/functions.ts` — `pageOwnership(page, meSub)`: the
      only place the FK `page.owner` is compared. **Never `owner_user.sub`** —
      `backend/modules/pages/policy.py:26-28` carries its own comment saying the
      relationship is `None` on an ownerless page and that it runs on every read.
- [x] 4.4 Same file — `ownershipLabel(o)`.
- [x] 4.5 Same file — `myPagesQueryOptions({...})` and
      `pageAdminsQueryOptions({...})`, colocated with their fetches the way
      `pageDetailQueryOptions` (`:61-66`) already is. The two components
      currently build query options inline, so the param lists live in two
      places already.
      **Note:** `myPagesQueryOptions` was deleted in `b176a18` because it "had
      no callers, and it was a third way to ask the same question with
      `owner_sub=me`." It is being re-added here for a different reason — it
      now carries the real filter/sort params rather than a third ownership
      encoding. Do not resurrect `owner_sub`. If it still has no callers after
      Phase 5, delete it again rather than leaving it dead. **Both are called in
      5.5 and 6.4, which rewrite the two components — at this commit they have
      no caller, so the instruction above is a live check and not a formality.**
- [x] 4.6 `web/src/components/shared/pages/visibilities.ts` — keep only the human
      copy and its helpers. Add `visibilityLabel(value)`, so both tables' cells
      read the same way.
- [x] 4.7 `web/src/lib/pages/functions.ts:243` — **the comment is factually
      wrong.** It says "Admin only, per `PagePolicy` — the owner cannot delete
      their own club." `policy.py`'s DELETE branch and `utils.py:30-32` both grant
      the owner `can_delete`. Delete the comment. Do not change the behaviour —
      the behaviour is right and the comment is wrong.
- [x] 4.8 `web/src/lib/pages/tests.ts` — truth table for `pageOwnership`
      alongside the existing `adminPageActions` one: FK match, FK `null` on an
      ownerless page, and a case where `owner_user.sub` disagrees with `owner` to
      prove the FK is what gets read. That last case is the regression test for
      the whole reason this helper exists.

### Phase 4 — what reality added

**`pageOwnership` cannot answer "does this viewer administer the page", and the
docstring says so.** `ResourcePermissions` has no is-admin flag, and
`can_manage_admins` is not a substitute: `utils.py:21-28` grants it to site
admins alongside `can_edit`, which is exactly why `admin-controls/index.tsx` had
to write the `pinnedSelf` inference as `can_edit && !can_manage_admins` — two
terms because one term is ambiguous. So the function is written the only way it
can be: FK match is `"owner"`, everything else is `"admin"`, and that is correct
**only for a list the server already filtered** to the pages you own or
administer. `/pages/mine` is the only such list, and 4.8 pins the boundary with
a test. Anyone reaching for this to ask a general question is about to rebuild
`pinnedSelf` under a new name.

**`PageOwnership` is `PageRole`, not a third type.** Box 4.1 says
`"owner" | "admin"` and the generated `PageRole` is exactly those two, so
`PageOwnership` is a derived alias rather than a retyped union. There is no
`"none"` case: a page you have no relationship with never appears in
`/pages/mine`, and a value the function cannot produce is a branch nobody
tests.

**`order` has no schema name, so `PageOrder` reads it back off the operation.**
`schema.d.ts` types `/pages/mine`'s `order` as a bare `"asc" | "desc"` inline in
the operation, with no `PageOrder` component to import. A hand-written union
here would be a second copy of a direction list, and the copy that survives a
backend that adds a third. `MyPagesQuery` pulls the whole query bag off
`operations["get_my_pages_pages_mine_get"]` instead, so a new query param
arrives as a type error rather than as a silently dropped argument.

**4.6's move had three call sites to repoint, not one.** `visibilities.ts` no
longer exports `VISIBILITIES` or the type, so `visibility-picker.tsx` and
`settings/general/index.tsx` now import the list from `lib/pages/constants` and
the type from `lib/pages/types`. This is the third and last place visibility
values live, as 4.2 requires.

**The test fixture is a full `PageResponse`, not a cast.** The first version was
`{ owner, owner_user } as unknown as Page`, which is the sort of cast that
`typescript(no-unsafe-type-assertion)`:warn is aimed at — and it would have kept
passing if a field `pageOwnership` reads were renamed in the regenerated
`schema.d.ts`. Nine required fields later, the fixture is type-checked against
the real schema and cannot drift. Two schema details cost a retry: `owner_user`
is `ShortUserResponse | null` whose `picture` is a **required `string`**, not
`string | null`, and `permissions.editable_fields` is a mutable `string[]` so an
`as const` shared object does not fit.

---

## Phase 5 — My Pages table

Rewrites `web/src/components/routes/account/components/my-pages.tsx`.

Columns, in order: `logo | name (link) | slug | role | visibility | actions`

- [x] 5.1 Column definitions for the six columns above.
- [x] 5.2 Logo: `ResilientImage` + `selectMedia(page.media, "profile")`, the
      `rounded-md` / `size-10` treatment from `my-pages.tsx:149-154`, unchanged.
- [x] 5.3 Name: a `<Link to="/p/$slug">` **in the cell**, not the whole row. A
      react-table row cannot be a link and still host an actions cell; the
      `Item render={<Link>}` hack (`:147`) is part of what the table replaces.
      Sortable.
- [x] 5.4 Slug: muted text, `max-w-48 truncate`, `title={page.slug}`. Max length
      is 50 (`schema.d.ts:2747`) so truncation is rare, but a truncated cell with
      no way to read it is a real loss. Plain text, **not** a second link to the
      same place as the name. **Not sortable.**
- [x] 5.5 Role: `secondary` Badge via `ownershipLabel(pageOwnership(...))`.
      Header reads `Role` — the rename from "ownership type", matching the Admins
      table.
- [x] 5.6 Visibility: `outline` Badge via `visibilityLabel(page.visibility)`.
      Sortable. The `outline` / `secondary` split is deliberate so two adjacent
      badge columns do not read as one field of identical pills.
- [x] 5.7 Actions: a `Settings` button, rendered only when the user can edit
      (`canEditField(page, "name")` — same gate as `general/index.tsx:99`, which
      uses `canEditField(page, "visibility")`), and a `Delete` button, rendered
      only when `page.permissions.can_delete`. Use the same responsive button
      pair pattern as `admins-table.tsx:280-335`. **No bulk path, no multi-page
      confirm dialog.**
- [x] 5.8 Toolbar row — a `FilterTabs` and a `MultiFilter` plus the button,
      one row (**not** two `MultiFilter`s — see the Phase 5 findings):

      ```tsx
          <div className="flex flex-wrap items-center gap-2">
            <MultiFilter label="Role" … />
            <MultiFilter label="Visibility" … />
            <Button className="ml-auto" onClick={() => setIsCreating(true)}>
              <PlusIcon aria-hidden />
              Create page
            </Button>
          </div>
          ```

          `isCreating` and `PageFormDialog` **stay in this file** — the button keeps
          its own state. The only edit to the existing markup is `justify-end` on the
          old wrapper becoming `ml-auto` on the button.

- [x] 5.9 Role filter options: `All roles` / `Owned by me` /
      `Where I'm an admin`. An empty selection omits the param entirely.
- [x] 5.10 Visibility filter options, labelled from the same copy the picker uses
      — one label set, or the picker bug in 8.4 comes back.
- [x] 5.11 Empty state branches on whether any filter is active: with filters,
      "No pages match your filters" plus a clear action; without, "No pages yet"
      plus create. Do **not** issue a second unfiltered request to learn the true
      total — that doubles the queries on the slowest screen. The one
      inaccuracy is accepted: a genuinely empty account with a filter on reads
      as "no pages match your filters", which is a harmless wrong sentence.
- [x] 5.12 Note the `?page=` empty-value hazard for Phase 7: this route's
      `validateSearch` has **no** `.catch(1)` on `page`, so a bare `?page=` fails
      validation. `admin-controls/index.tsx:9-15` documents the fix.

### Phase 5 — what reality added

**5.8's "two `MultiFilter`s" is not possible for the role filter.**
`MultiFilter` is multi-select (`selected: T[]`), and the backend's `role` takes a
single `PageRole` — there is no way to express "owner *and* admin" in the API.
Role is therefore a `FilterTabs`, the existing house component for single-choice
state in the URL, and its built-in **All** chip maps to `undefined`, which is
exactly what an omitted `role` means. Visibility keeps `MultiFilter` because
`visibility` really is an array.

**That changed the two filter constants from what 4.2 specified.** Both lost
their "all" entry — `PAGE_OWNERSHIP_FILTERS` because `FilterTabs` supplies its
own All, `PAGE_VISIBILITY_FILTERS` because `MultiFilter`'s Clear button empties
the selection and an empty array is omitted. An "All" entry in either list would
have been a second All control doing the same job as the first.

**7.1 had to happen inside Phase 5, so it is ticked here too.** A filter that
writes `?role=admin` cannot ship against a route that rejects `role`, so the
account search schema grew `size`, `role`, `visibility`, `sort` and `order`
along with the `.catch(1)` on `page` that 5.12 predicted. 7.4's rule — every
filter and sort change resets `page` to 1 — is applied in one `changeSearch`
helper rather than at each call site, because the missing-reset bug is
invisible in review and repeats at every site that forgets.

**`PAGE_SORTS` exists because a cast is worse than a list.** The first version of
`sortingToSearch` did `first.id as PageSort`, which trips
`typescript(no-unsafe-type-assertion)` and, worse, would have written any string
into the URL. `PAGE_SORTS` is now the runtime list, used by three things that
have to agree: the route's `z.enum`, `isPageSort`'s guard, and the backend's
whitelist. It is the same argument 4.2 makes for `PAGE_VISIBILITY_VALUES`.
`created_at` is in the list but has no column — the six columns have no date —
so it is reachable by URL and by nothing else.

**The header chevrons were silently dead, and 3.5 does not mention it.**
`useDataTable` passes `state: { sorting }`, so react-table's toggle has nowhere
to put its result and drops it: `column.getToggleSortingHandler()` — the exact
call 3.5 requires — becomes a no-op, and the table looks sortable and is not.
`onSortingChange` is now an explicit option, and the hook's docstring says why
it is not optional. Nothing in the plan would have caught this, because a dead
chevron still renders, still has the right icon, and still passes typecheck.

**`react/no-unstable-nested-components` needed `allowAsProps` for the column
defs.** Ten warnings, one per `header`/`cell`. react-table's column definitions
*are* components-in-props by design, and `allowAsProps` is the rule's own opt-in
for that shape, so it went into the same `vite.config.ts` override as Phase 3's
rather than into ten `// eslint-disable` comments.

**4 tests, 91 total.** `sortingToSearch` is the one piece of new logic with a
branch worth pinning: it has to clear both params on react-table's third click,
keep only the first column, and drop an id the API will not sort by.

---

## Phase 6 — Admins table

Rewrites
`web/src/components/routes/pages/settings/components/admins-table.tsx`.

Columns, in order: `checkbox | avatar | name | role | actions`

- [x] 6.1 **The pinned rows.** "You" and "Owner" cannot live outside the table
      body: the owner is not in the admins list, and "You" is removed via
      `exclude_sub` so the counts line up. Feed them to react-table as rows with
      `meta.pinned` — sorted first, selection disabled on them.
      `pageRangeSummary(data, pinned)` already exists for exactly this case and
      has a test at `page-range.test.ts:31`; keep passing the pinned count. Do
      not "simplify" it to a plain count, or the footer will claim more admins
      exist than the table can page through.
- [x] 6.2 Checkbox column: bulk `Remove` on the selection; `Make owner` offered
      **only when exactly one row is selected** — you cannot make three admins
      the owner at once, and the button must not merely look disabled.
- [x] 6.3 Avatar: reuse the pattern already working at
      `admins-table.tsx:264-272` — `ItemMedia`'s sizing is irrelevant in a table
      cell, so this becomes `Avatar` / `AvatarImage` / `AvatarFallback` with
      `initialsOf(name, surname)`.
- [x] 6.4 Name: sortable. Keep the `initialsOf` helper (`:39`).
- [x] 6.5 Role: `secondary` Badge — `You` / `Owner` / `Admin`.
- [x] 6.6 Actions: port the existing inline responsive pairs (`:280-335`) into a
      `TableCell`. Copy the logic, not the markup.
- [x] 6.7 `adminPageActions()` (`lib/pages/functions.ts:382-390`) stays the sole
      gate, and the bulk bar calls it too. Do not re-derive the rules in the
      component — that is how the two copies diverge.
- [x] 6.8 Delete `pinnedSelf` (`admin-controls/index.tsx:33-34`). That 6-line
      inference (`can_edit && !can_manage_admins` ⇒ "I am a plain admin") exists
      only to decide whether to pass the `me` prop. Always pass `me` and let
      `pageOwnership` decide per row.
- [x] 6.9 `web/src/components/routes/pages/settings/admin-controls/index.tsx:24`
      (`isCurrentUserOwner`) routes through `pageOwnership` too.
- [x] 6.10 Add `sort` / `order` wiring to the route's search and the component.

---

### Phase 6 — what reality added

**6.8's `pinnedSelf` was a guess, and the thing it guessed is a fact the
session already knows.** The inference — `can_edit && !can_manage_admins` means
"I am a plain page admin" — existed to decide one thing: whether to pass the
`me` prop. But the two roles it was trying to tell apart, a page admin and a
site admin, are *not* distinguishable from the page's permissions, because both
get `can_manage_admins`. They are trivially distinguishable from the session's
own `role`, which `usePermissions()` already exposes as `isAdmin`. So `me` is
now unconditional and the table asks two facts instead: am I the owner (no
"You" row — the Owner row is me), am I a site admin (no "You" row — I was never
in the list, and there is nothing to leave). A wrong answer here is not a
cosmetic duplicate row; it is a Leave button on a membership the user does not
have.

**6.1's pinned count was hand-summed, and the hand-sum is what 6.1 is about.**
The old footer passed `(me ? 1 : 0) + 1` — two `if`s' worth of arithmetic kept
in step by hand with two `if`s' worth of rendering. One list of rows with a
`pinned` flag makes the count `rows.length - items.length`, which cannot drift,
and the `pinned` flag is also what `enableRowSelection` and the per-row
`adminPageActions` call read. The plan's warning against "simplifying" the
`pageRangeSummary` call was right, and the flag is how the plan's own
requirements share one value.

**6.2's "Make owner" is not rendered for a multi-row selection.** Ownership is
one row's worth of authority, so with three rows selected the button would be a
control that cannot do what its label says. Per the box, it is absent rather
than disabled. Bulk Remove is N requests — the endpoint takes a single
`user_sub` — so the confirm dialog closes on `Promise.allSettled` and reports
partial success through a toast rather than stranding the dialog on one
failure, or swallowing it.

**`enableRowSelection` is a table option in v8, not a column one.** The plan's
6.2 reads as a checkbox-column concern, and the per-row `disabled` in the cell
does come from the column — but `row.getCanSelect()` and the header's select-all
both read a *table* option, so it went on `useDataTable` next to `getRowId`.
The header checkbox is also disabled when no row on the page is selectable,
because a page whose only rows are "You" and "Owner" has nothing to select and a
live-looking checkbox that does nothing is the same lie as a checkbox on a
pinned row.

**`QueryBoundary` was the wrong wrapper once the table drew itself.** It returns
`pending` *instead of* its children, so wrapping the `DataTable` would have
hidden the toolbar, the two pinned rows and the footer for the whole first load
— the pinned rows are exactly what the old code drew *outside* the boundary, for
exactly this reason. What the boundary still provided was the error surface, so
only that is used now: `query.isError ? <QueryError/> : <DataTable/>`, and the
table's own skeleton covers the pending state. A page with an error therefore
shows the error and a footer, not an empty table above a "Showing 1–2 of 2" that
never loaded.

**`sortingToSearch` is now shared, and takes its whitelist as an argument.**
Pages sort by name / visibility / created_at and admins by name / created_at, so
one hardcoded guard could not serve both — the alternative is a cast, which is
what Phase 5 deleted. One extra parameter, one test, and the two tables cannot
silently sort by a column the other one accepts.

**6.6's "copy the logic, not the markup" was the instruction that mattered.** The
old rows had four near-identical buttons: two actions × a labelled button
(`hidden sm:inline-flex`) and an icon-only one (`sm:hidden`). Ported literally
into a cell that is eight duplicated blocks; ported as a local
`ResponsiveAction` it is two calls, and the two widths cannot drift — which is
the actual failure mode of copy-paste here, a phone with an unlabelled "Remove"
next to a desktop with no icon.

---

## Phase 7 — Route search schemas

- [x] 7.1 `web/src/routes/_app/account/index.tsx` — `page`, `size`
      (`PAGE_SIZES`, `DEFAULT_PAGE_SIZE`), `role`, `visibility` (array), `sort`,
      `order`. Add `.catch(1)` to `page`, copying the comment from
      `admin-controls/index.tsx:9-15`.
- [x] 7.2 `web/src/routes/_app/p/$slug/settings/admin-controls/index.tsx` —
      add `size`, `sort`, `order`. Keep its existing `.catch(1)`.
- [x] 7.3 The course-templates route — add `size`. It is the third hardcoded
      `PAGE_SIZE` at
      `components/routes/courses/components/course-template-tools.tsx:25`.
- [x] 7.4 `size`, `role`, `visibility`, `sort` and `order` must each reset `page`
      to 1. Landing on page 7 of a 2-page result is the classic symptom of
      missing this.
- [x] 7.5 `visibility: z.array(z.enum([...])).optional()` — this exact shape
      already exists at `routes/_app/opportunities/index.tsx:13-16` (paired with
      four `MultiFilter`s at `:487-523`) and `routes/_app/courses/audit/index.tsx:17-18`.
      Follow it; do not invent a URL encoding.
- [x] 7.6 The two `onSearchChange` signatures diverge today — account takes
      `(updater, replace?)`, admin-controls does not. Make them match.

### Phase 7 — what reality added

**7.3 names a route that does not exist.** There is no course-templates route:
`course-template-tools.tsx` is a dialog inside `course-card.tsx`, and
`course-card.tsx` is rendered by both `/courses` and `/courses/schedule`. A
`size` param on either of those routes would be one page-size control fighting
the other for a single URL key, describing a dialog the reader has not opened
yet — and the two course lists would reset each other's page size. So the size
is local state, and what 7.3 is actually after — the third hardcoded `PAGE_SIZE`
literal (9.1) — is gone: the value is `DEFAULT_PAGE_SIZE` and the choices are
`PAGE_SIZES`, the same list the other two tables validate against.

**The hand-rolled Previous/Next went with it.** Twenty-two lines of
`disabled={page === 1}` / `setPage(value => value + 1)` became the shared
`TablePagination`, which also brought the page-size control 7.3 wanted. The
range summary is `null` and the box says so: `ListTemplateDTO` carries
`total_pages` and nothing else, so there is no total and no count to describe.
`hasNext` is therefore `page < total_pages` — the same thing the old
`disabled={page >= data.total_pages}` said, expressed as data instead of as a
disabled attribute.

**7.4's reset had three call sites before it had one rule.** Account's role
filter, visibility filter, sort and page size each reset `page`; admin-controls'
sort and page size each reset `page`. That is six chances to forget one, and
forgetting it is invisible in review — the symptom is landing on page 7 of a
2-page result. Each table now has a single `changeSearch` that sets
`page: patch.page ?? 1`, so a real page click keeps its number and everything
else resets, and the courses dialog resets in the one place it has a page
change to go wrong.

**7.6 was fixed by deleting a parameter, not by adding one.** The two
signatures differed by an optional `replace`, and no caller anywhere passed it —
it was declared in three places (the route, `account/index.tsx`, `my-pages.tsx`)
and used in none. Adding it to admin-controls would have made two signatures
agree on a knob nobody turns. The account route pushes rather than replaces, and
now says why: a filter or a page is a history entry, so Back walks the reader
out of the table the way it walked them in.

---

## Phase 8 — The small fixes

These are independent of the tables and could be done in any order. They are
collected here because they were found in the same pass.

- [x] 8.1 **Avatar on `/account` — fixed by deleting the broken markup.**
      `components/routes/account/index.tsx:58-77` puts a `size-12 rounded-full`
      `ResilientImage` inside `ItemMedia variant="image"`, which hardcodes
      `size-10 overflow-hidden rounded-sm` (`ui/item.tsx:90-91`). The inner box is
      _larger than its clipper_, so the `rounded-full` never reads and the picture
      is cropped to a rounded rectangle. 8.2's `media` prop removes the
      `ItemMedia` entirely; `Avatar` is already `rounded-full` and self-sizing,
      so no class overrides are needed. `ResilientImage` stays — it is still used
      for the page logo and in `page-card.tsx`.
- [x] 8.2 **`Page` gains a `media` prop.**
      `components/shared/page/header.tsx:27` — the existing `<div>` becomes a
      flex row, with the inner text block kept at `flex-1` so pages _without_
      media keep today's wrapping exactly:

      ```tsx
          <div className="flex min-w-0 items-center gap-3">
            {media}
            <div className="min-w-0 flex-1">
              {eyebrow && …}
              <h1 …>{title}</h1>
              {description && …}
            </div>
          </div>
          ```

          `components/shared/page/index.tsx` threads `media` through and adds it to
          the `hasHeader` check at `:54`. Every other `Page` caller is unaffected —
          that is why this is a new optional prop and not a required one.

- [x] 8.3 **Rewrite `/account`'s header and sections**
      (`components/routes/account/index.tsx`): - [ ] `eyebrow="Account"`, `title={me.name}`, `description={me.email}`,
      `media={<Avatar size="lg">…</Avatar>}`, `width="wide"`. The eyebrow
      uses the slot that already exists at `header.tsx:29`, so the route
      keeps its name while the `h1` is the person. - [ ] Delete the page description (`:48-49`) and the duplicate
      `SettingsSection title="Account"` + its description (`:52-55`). The
      word "Account" currently appears as an `h1` and an `h2` ~30px apart,
      and the two descriptions say the same thing. - [ ] Rename the section to **"Integrations"**. The Telegram `Item` stays,
      `ItemGroup` and all — the group is one `div` today and is what gives
      the second integration its gap. - [ ] **Do not** make `SettingsSection`'s `title` optional
      (`settings/settings-section.tsx:6`). It stays required.
- [x] 8.4 **Visibility labels: the trigger and the dropdown disagree.**
      `shared/pages/visibility-picker.tsx:45-56` passes no `items` to
      `Select.Root`, so base-ui falls back to rendering the raw value and the
      `capitalize` class on the trigger at `:55` shows **"Internal"** while
      `SelectItem` at `:61` shows **"NU only"**. Fix: pass
      `items={{ public: "Public", internal: "Members only", private: "Private" }}`
      to `Select.Root` and drop `capitalize`. One label set everywhere.
- [x] 8.5 **Simplify the visibility copy** (`shared/pages/visibilities.ts`) —
      `Public` / `Members only` / `Private`, one short line each. Remove
      "Outsiders see a 404." (`:14`): a 404 is a transport detail, not something
      a user needs. Also drop the 404 mention in `general/index.tsx:102`.
- [x] 8.6 Sidebar (`components/layouts/app/app-sidebar.tsx:51-57`) — move
      `/mynuspace` to first position in `NAV_ITEMS`, `UserIcon` → `GlobeIcon`.
      **Labels unchanged.**
- [x] 8.7 **"Admin access link" into an `Item`.**
      `components/routes/pages/settings/components/admin-access-link.tsx` —
      wrap in `Item variant="muted"`, read-only `Input` in `ItemContent`, Copy
      and Rotate in `ItemActions`, drop the `SettingsSection` description (the
      comment at `:36-39` explains why there was _no_ `Item`; it goes with it).
      Also clear the un-cleared `setTimeout` at `:28` on unmount — it fires
      `setCopied` on an unmounted component.
- [x] 8.8 **FilterTabs scrollbars — found, and it is not an overflow bug.**
      `ui/tabs.tsx:62` gives `TabsTrigger` an `after:bottom-[-5px] after:h-0.5`
      bar that nothing clips. `FilterTabs` (`shared/list-filters.tsx:81`) and
      `RouteTabs` (`shared/route-tabs.tsx:46`) both put `overflow-x-auto` on the
      `Tabs` **root**, and per CSS `overflow-x: auto` forces `overflow-y: visible`
      to compute to `auto` — that 5px bar is real scrollable overflow, hence the
      vertical scrollbar. Fix: add `overflow-y-hidden` to both. The horizontal
      scrollbar is legitimate (the `TabsList` cannot shrink below its content)
      and stays. Do not "fix" this by editing `ui/tabs.tsx` — it is vendor code
      and the other two call sites get it for free.
- [x] 8.9 `components/routes/mynuspace/index.tsx:42-44` — delete the stale
      `include_private: false` comment. That parameter no longer exists anywhere;
      the exclusion now lives in `repository.py:_list_conditions`. The comment
      actively misleads: it reads like a caller is passing it.
- [x] 8.10 `components/routes/pages/settings/general/index.tsx:46` — "Put the
      radio back where it was." There is no radio; it is a `Select`.
- [x] 8.11 **Duplicated `TelegramBindChallenge`** —
      `lib/user/types.ts:17-20` and `hooks/use-connect-telegram.ts:38-41` are
      two shapes with one name. Collapse to one.
- [x] 8.12 `shared/pages/page-form.tsx:35` — the hand-written
      `z.enum(["public", "internal", "private"])`. zod 4 needs a literal tuple, so
      it cannot derive from the generated union; point it at `PAGE_VISIBILITIES`
      from `lib/pages/constants.ts` so there is one list. After this, visibility
      values exist in exactly two places: the derived _type_ (schema) and the
      runtime _tuple_ (constants).

### Phase 8 — what reality added

**8.4's suggested fix would have created the second label set Phases 4 and 5
just deleted.** The box says to pass
`items={{ public: "Public", internal: "Members only", private: "Private" }}` to
`Select.Root` — a literal object, next to the `SelectItem`s that render
`option.title` from `PAGE_VISIBILITIES`. That is the same two-sources bug 8.4 is
reporting, one level down: the trigger and the dropdown would agree today and
drift the first time someone edits `constants.ts`. So `items` is derived —
`PAGE_VISIBILITIES.map(o => ({ label: o.title, value: o.value }))` — and the
`capitalize` class is gone rather than kept as a third rendering of the same
value. (base-ui's `items` here takes a record or an array, not the function form
its docs show; the array needs no cast to keep the literal key type, so no
`as Record<...>` either.) 5.10's "one label set" now covers the trigger, the
dropdown, the table badge, the filter chips and the settings row.

**8.7's warning moved rather than disappeared.** The box says to drop the
`SettingsSection` description, and the description is exactly the sentence that
decides whether this link gets pasted into a public channel — dropping it
outright would have lost the only warning the feature has. It is now the
`Item`'s `ItemDescription`, which is a better home than the one it was in: a
section header scrolls out of view, the row does not, and the sentence now sits
next to the thing being copied. The comment that argued for the old shape (no
`Item` title, because the section above already says it) went with it, as
instructed — but its actual observation was right and the fix was in the wrong
place.

**8.8 is CSS, and the diagnosis in the box is the interesting part.** The 5px
`after:` bar on `TabsTrigger` is real vertical overflow once the root scrolls
horizontally, because `overflow-x: auto` forces `overflow-y: visible` to compute
to `auto`. So the fix belongs on the two `Tabs` roots — `overflow-y-hidden`
next to `overflow-x-auto` in `FilterTabs` and `RouteTabs` — and not in
`ui/tabs.tsx`, which is vendor code whose other call sites get the fix for
free. The horizontal scrollbar stays: the `TabsList` genuinely cannot shrink
below its content.

**8.1 was a sizing bug, not a styling one.** The old markup put a `size-12`
image inside `ItemMedia`'s hardcoded `size-10 overflow-hidden rounded-sm`, so the
inner box was *larger than its clipper* — the `rounded-full` was cropped away
and no amount of class tweaking on the image could have fixed it. `Avatar` is
already round and sizes to its own content, so the `media` prop takes the
caller's node and neither element needs a size override. `ResilientImage` is
gone from this file but still used for the page logo and in `page-card.tsx`.

**8.12 needed no cast.** The box worried that "zod 4 needs a literal tuple", but
`z.enum` accepts `PAGE_VISIBILITY_VALUES` directly — the account route's
`z.array(z.enum(PAGE_VISIBILITY_VALUES))` has been doing it since Phase 5.
Visibility values now exist in exactly two places, as the box predicted: the
derived _type_ from the schema and the runtime _tuple_ in `constants.ts`.

**8.11 was a delete, not a merge.** `use-connect-telegram.ts` re-declared
`TelegramBindChallenge` identically to `lib/user/types.ts`, and the only
consumer already imported the one from `@/lib/user` — so the hook's copy had
zero readers. It is gone rather than aliased.

**8.3's `width="prose"` was going to break the table it sits above.** `/account`
is a `prose` page, and `prose` centres the body in `max-w-3xl`; a six-column
table in a 48rem column scrolls sideways. It is `wide` now, which is the same
change 10.3 asks `CONVENTIONS.md` to record as a rule: a page hosting a
datatable is `wide`. The eyebrow keeps the route's name now that the `h1` is
the person, so "Account" is not an `h1` and an `h2` 30px apart.

---

## Phase 9 — Dead code

- [x] 9.1 Remove the three hardcoded `PAGE_SIZE` literals — now covered by
      `PAGE_SIZES` / `DEFAULT_PAGE_SIZE`: `my-pages.tsx:31`,
      `admins-table.tsx:37`,
      `components/routes/courses/components/course-template-tools.tsx:25`.
- [x] 9.2 Remove the stale comments and duplicates listed in 8.9–8.12.
- [x] 9.3 **Do not delete anything from `web/src/components/ui/`.** 39 primitives
      have no importer — `sidebar.tsx` (the app hand-rolls its own rail in
      `app-sidebar.tsx`), `toast.tsx` (the app uses `sonner` directly),
      `alert-dialog.tsx` (every confirm goes through `shared/confirm-dialog.tsx`),
      plus `accordion`, `chart`, `carousel`, `drawer`, `command` and ~32 more.
      `CONVENTIONS.md:96-105` calls `ui/` vendor code owned by shadcn; these
      arrived via `shadcn init`, and `table.tsx` is arriving from the same
      registry in Phase 3. Deleting them would leave the next `shadcn add`
      unable to resolve a dependency. This was explicitly ruled in.
- [x] 9.4 Do not remove `useDeletePage` — it is still live through the Danger
      zone at `general/index.tsx:158`.

---

## Phase 10 — `web/CONVENTIONS.md`

Last, so the document describes the code that landed. Seven edits:

- [x] 10.1 `shared/table/` and `shared/data-table/` are missing from the shared
      -domains list (`:81-89`).
- [x] 10.2 Note that `useDataTable` lives in `src/hooks/`, not beside the
      component — `CONVENTIONS.md:179-183` puts shared _stateful_ behavior in
      `hooks/`, and putting it in `components/shared/` would have looked right
      and been wrong.
- [x] 10.3 Move `/account` and `/settings/admin-controls` to `wide` in the
      assignment table (`:138-145`). Six columns do not fit in `prose`.
- [x] 10.4 A new rule: a page hosting a datatable is `wide`.
- [x] 10.5 Styling: `overflow-x-auto` must be paired with `overflow-y-hidden` or
      `overflow-y-clip`. This is 8.8 generalised from one bug to a rule.
- [x] 10.6 Pagination `size` comes from the route's `validateSearch`, and the
      allowed values from that module's `constants.ts` — no `PAGE_SIZE` literals
      in components.
- [x] 10.7 The page-layout section documents the header as "the title, spanning
      the box" (`:113-115`). Add a line for the `media` prop and the
      avatar-in-header pattern.

---

## Progress log

Append one line per ticked box. Newest at the bottom.

| Date       | Phase | What                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| —          | —     | Plan written          | `web/PROGRESS-datatable.md` created. No code changed yet. Sibling of `web/PROGRESS.md`, which is live and untouched.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| —          | —     | Plan corrected        | Phase 1 was found to reverse `b176a18`, which removed the `role` filter and the `mine` visibility clause two commits earlier. **The user confirmed the reversal is intentional.** Added a "Read this first" section carrying the three historical bugs, and turned 1.8/1.9 from "rewrite these docstrings" into "rewrite but preserve the history in them". Line refs re-verified against the tree: `_list_conditions` `:108`, `mine` branch `:136`, `list_pages` `:151`, `meili` short-circuit `:165-177`, `order_clause` `:190-194`, order chain `:206-211`, `list_admins_page` `:241`.                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-30 | 0     | Pre-flight            | `web/PROGRESS.md` Phase 4 **fully ticked** — no race. Phases 5/6/7 open and staying open (docs / prod push / deferred). Baseline commit `fea3b84`. Four pre-existing reds fixed, all detailed above: the `fastapi` container had not booted in two days (`openai` missing from the stale `fastapi-venv` volume, so `api:check` was unrunnable), `schema.d.ts` 434 lines behind on the `agent` module, ruff 16 not 11 (the extra 5 in `modules/pages/`), and black red on two more pages files. **Green now: backend 209 tests, ruff 11, black ✓. Web 83 tests, typecheck ✓, build ✓, lint 9 = baseline, `api:check` ✓.** Note `pnpm api:check` runs on the host here, so `OPENAPI_URL=http://localhost/api/openapi.json`; the file's `http://nginx/…` advice only applies from inside the `web` container.                                                                                                                                             |
| 2026-09-30 | 1     | Backend role/vis/sort | `df94076`. Reverses `b176a18`'s `role` removal. `role=admin` is `administered AND NOT owned`, via `is_distinct_from` not `!=` (nullable `pages.owner` — `!=` would hide an ownerless page you administer). `PageRole`/`PageSort`/`PageAdminSort` enums, so FastAPI 422s an unknown value and the whitelist dict is keyed by the same members. `sort=None` leaves the order chain byte-for-byte; an explicit sort replaces it whole, owner-first prefix dropped, `pages.id` tiebreaker added. The two chains are now classmethods (`_page_order_clauses`, `_admin_order_clauses`) so the tests call the real query like `_where` does. Three docstrings rewritten **with** their history, not deleted. Meilisearch silent-ignore commented at both ends. No `role`/`visibility` on the admins endpoint. **237 backend tests (was 209), ruff 11 = baseline, black ✓.** Disjointness confirmed red twice: `!=` → 3 failures, clause deleted → 4 failures. |
| 2026-09-30 | 2     | Schema + query keys    | `e8966b4`. `api:generate` → `schema.d.ts` +84: the `PageRole`/`PageSort`/`PageAdminSort` enums, the `visibility` array param and `sort`/`order` on both endpoints. `api:check` ✓. `qk.pages.mine` and `qk.pages.admins` now take a **filter object** carrying every param (`page`, `size`, `role`, `visibility`, `sort`, `order`) rather than positional args — the file's own `pages.list`/`events.list` precedent, since five positional args stop being readable. `page` is inside that object, not beside it; `invalidateQueries(qk.pages.all())` still clears every page, since `all()` is the `["pages"]` prefix and never reads the filters. (Correction made in Phase 3: the log and a comment in `query-keys.ts` originally said `page` stayed *outside* the object. The code always had it inside; the comment was the thing that was wrong.) Both call sites updated; no behaviour change yet. 83 web tests, typecheck ✓, lint 9 = baseline. |

| 2026-09-30 | 3     | DataTable layer        | Pinned `@tanstack/react-table` to **8.21.3**, not the 9.2.4 that `pnpm add` gives: 3.3–3.5 name v8's API and v9 is a `useTable` + feature-flag rewrite. `useDataTable` wraps the only `useReactTable` call in the app — `manualPagination` + `manualSorting`, `getRowId` from the caller, sorting passed in from the URL rather than synced by the hook, and deliberately no `getFilteredRowModel` so the browser cannot re-filter rows the server already filtered. `DataTable` (empty row, `colSpan`, `toolbar` slot) + `DataTableSkeleton`; `DataTableColumnHeader` gates on `column.getCanSort()` so a non-sortable column is plain text with no dead chevron; `aria-sort` lives on the `TableHead`, because that is the `columnheader` role and not the button. `DataTableToolbar` **omits** the `table` argument shadcn's version takes — the component that fetched the rows is the only one that can invalidate them, so a toolbar that could see the table could be tempted to act on rows it cannot refetch. 3.7 extended `TablePagination` in place: `pageSize` + `onPageSizeChange` + a `Select`, both optional, and the **options come from the caller** rather than a literal `10/20/30/40/50` in the component, because the allowed sizes are a route's own `validateSearch` rule and a second copy of it is a second thing to forget. Two lint rules scoped off in `vite.config.ts` (details in the Phase 3 findings): the generated `ui/table.tsx` trips `enforce-canonical-classes` and 3.2 says not to hand-edit it, and `useReactTable` trips `react/incompatible-library` with the compiler off and nothing memoizing the table. No test added: this repo has no DOM or testing-library and all four existing web tests are pure functions, so Phase 3 has nothing assertable under that convention. **Web: 83 tests ✓, typecheck ✓, build ✓, `api:check` ✓, lint 9 = baseline.** Also corrected the Phase 2 log and a `query-keys.ts` comment that claimed `page` sat outside the filter object. |

| 2026-09-30 | 4     | Ownership/visibility    | `PageOwnership` and `PageVisibilityValue` now **derive from `schema.d.ts`** instead of being hand-written unions, and `lib/pages/constants.ts` holds the one runtime list each is checked against — `PAGE_VISIBILITIES` `satisfies` the derived type, so a fourth visibility on the backend is a compile error rather than a `Select` offering a value the server rejects. That made `shared/pages/visibilities.ts` copy-only, which meant repointing `visibility-picker.tsx` and `settings/general/index.tsx` at the new homes. `pageOwnership` is the single place the owner FK is read, and its docstring records the limit that matters: `ResourcePermissions` has no is-admin flag and `can_manage_admins` is not one (site admins get it too, which is why `pinnedSelf` needed two terms), so "not the owner" means "admin" **only** inside a list `/pages/mine` already filtered. 4.7's comment was wrong as suspected — `policy.py:89-91` grants DELETE via `_is_owner` and `utils.py:30-32` grants the owner `can_delete`; comment deleted, behaviour untouched. **4 new tests, 87 total.** The FK-not-`owner_user` case was confirmed red: swapping in `page.owner_user?.sub === meSub` fails 2 of them. Both `*QueryOptions` helpers have **no caller yet** — 5.5 and 6.4 rewire the two components, and 4.5's own "delete it again if unused" clause is the check. **Web: 87 tests ✓, typecheck ✓, build ✓, `api:check` ✓, lint 9 = baseline, 0 findings in touched files.** |

| 2026-09-30 | 5     | My Pages table         | `my-pages.tsx` is now a `DataTable`: `logo | name (link) | slug | role | visibility | actions`. The `Item render={<Link>}` whole-row-link hack is gone — the name is a link **in the cell**, which is what lets the row also host an actions cell. `slug` and `role` are plain text and unsortable; `name` and `visibility` carry chevrons, because the backend whitelist is name / visibility / created_at and a chevron on a column that cannot sort is a lie. 5.7's two gates kept separate: Settings on `canEditField(page, "name")`, Delete on `permissions.can_delete`, the latter behind a `ConfirmDialog`. No bulk path, per the decisions table. Empty state branches on whether a filter is active, with no second unfiltered request. **The role filter is a `FilterTabs`, not a second `MultiFilter`** — the backend's `role` is a single enum, so multi-select cannot be expressed, and `FilterTabs`' All chip is the omitted param. Both filter constants therefore lost their "all" entry (see 5.8's note). **7.1 is ticked here**: the filters write `?role=`/`?visibility=`, which the route's `validateSearch` would otherwise reject, so the account schema grew `size`/`role`/`visibility`/`sort`/`order` plus `page`'s `.catch(1)`. **The chevrons were dead on arrival** and no box mentions it: `state: { sorting }` is controlled, so `getToggleSortingHandler()` had nowhere to write and silently did nothing. `onSortingChange` is now an explicit option on `useDataTable` and the reason is in its docstring. `PAGE_SORTS` + `isPageSort` replace an `as PageSort` cast that both tripped the linter and would have written any string into the URL; the list now backs the route's `z.enum`, the guard, and the backend whitelist. 5.10's label-set requirement holds by construction — the visibility filter's labels are `PAGE_VISIBILITIES.map(o => o.title)`, so 8.5's copy change moves the filter with it. **4 new tests, 91 total.** Web: typecheck ✓, build ✓, `api:check` ✓, lint 9 = baseline, 0 findings in touched files; backend ruff 11 = baseline, black ✓. |
| 2026-09-30 | 6     | Admins table          | `admins-table.tsx` is now a `DataTable`: `checkbox | avatar | name (sortable) | role | actions`. **"You" and the owner became rows** with a `pinned` flag rather than two `Item` elements above the table, which is what 6.1 asks for and what makes the footer's `pinned` count `rows.length - items.length` instead of the hand-summed `(me ? 1 : 0) + 1` that had to be kept in step with two separate `if`s by hand. The flag is read three times — the count, `enableRowSelection`, and the per-row `adminPageActions` — so the three cannot disagree. **`pinnedSelf` is gone** (6.8): it inferred "I am a plain page admin" from `can_edit && !can_manage_admins`, which cannot actually tell a page admin from a site admin because both get `can_manage_admins`. The session's own `role` can, and `usePermissions()` already exposes it, so `me` is unconditional and `isSiteAdmin` decides the "You" row. A wrong answer was a Leave button on a membership the user does not have, not a duplicate row. `isCurrentUserOwner` now reads the FK through `pageOwnership` (6.9) — the old `page.owner_user?.sub === me.sub` compares two optional strings and answers "yes" when both are missing. **6.6's responsive pairs are one `ResponsiveAction` component, not the four buttons they were** — the two widths cannot drift apart that way. **6.2's "Make owner" is absent for a multi-row selection** rather than disabled, since ownership is one row's worth of authority; bulk Remove is N single-sub requests, so the dialog reports partial success via a toast instead of hanging on one failure. `enableRowSelection` had to go on `useDataTable`, not the column: in v8 `row.getCanSelect()` and the header's select-all both read a table option. `QueryBoundary` now guards only the error case — wrapping the table would hide the pinned rows, toolbar and footer for the whole first load, which is the one thing the old code kept them outside the boundary for. 7.2 shipped with 6.10 (the sort had nowhere to live otherwise), and `sortingToSearch` now takes its whitelist as an argument so the pages and admins tables share one mapper with no cast. **92 tests** (one new, pinning that the admins guard rejects a page-only column). Web: typecheck ✓, build ✓, `api:check` ✓, lint 9 = baseline, 0 findings in touched files; backend ruff 11 = baseline, black ✓. |
| 2026-09-30 | 7     | Route search schemas   | 7.1, 7.2, 7.5 shipped inside Phases 5 and 6 because a filter or a sort that writes `?role=`/`?sort=` has nothing to live in if the route's `validateSearch` rejects it. **7.3 names a route that does not exist** — `course-template-tools.tsx` is a dialog inside `course-card.tsx`, which both `/courses` and `/courses/schedule` render, so a `size` param on either would be one control fighting the other for a single key over a dialog nobody has opened. The size is local state; what 7.3 wanted (the third hardcoded `PAGE_SIZE`, also 9.1) is gone in favour of `DEFAULT_PAGE_SIZE` and `PAGE_SIZES`. Its 22-line hand-rolled Previous/Next became the shared `TablePagination` in the same pass, which is where the page-size control came from; `summary` is `null` because `ListTemplateDTO` carries `total_pages` and no total to count, and the box says so. **7.4: six call sites had to remember to reset `page` and forgetting it is invisible in review** — each table now has one `changeSearch` doing `page: patch.page ?? 1`, so a real page click keeps its number and everything else resets. **7.6 was fixed by deleting a parameter, not adding one**: the signatures differed by an optional `replace` that no caller anywhere passed (declared in three places, used in none), so both are now `(updater) => void` and the account route documents why it pushes rather than replaces — a filter or a page is a history entry. 92 tests. Web: typecheck ✓, build ✓, `api:check` ✓, lint 9 = baseline, 0 findings in touched files. |
| 2026-09-30 | 8     | The small fixes       | **8.4's suggested fix would have rebuilt the second label set Phases 4 and 5 just deleted** — the box's literal `items={{ public: \"Public\", ... }}` sits next to `SelectItem`s rendering `option.title` from `PAGE_VISIBILITIES`, which is the same two-sources bug one level down, agreeing today and drifting on the first edit to `constants.ts`. `items` is derived instead, and `capitalize` is gone rather than kept as a third rendering of one value. 5.10's \"one label set\" now covers the trigger, the dropdown, the table badge, the filter chips and the settings row. **8.7's warning moved rather than disappeared**: the section description being dropped is the only sentence deciding whether this link gets pasted into a public channel, so it is now the `Item`'s `ItemDescription` — a better home, since a section header scrolls out of view and the row does not. The comment that argued for the old shape went as instructed, but its observation was right and the fix was in the wrong place. Its un-cleared `setTimeout` is now a ref cleared on unmount (no new shared hook for one call site). **8.1 was a sizing bug, not a styling one**: a `size-12` image inside `ItemMedia`'s hardcoded `size-10 overflow-hidden rounded-sm` was larger than its clipper, so `rounded-full` was cropped away and no class on the image could have fixed it. `Avatar` is round and self-sizing, so the new `media` prop takes the caller's node and neither element needs a size override. **8.3's `prose` would have broken the table above it** — a six-column table in a centred `max-w-3xl` scrolls sideways, so `/account` is `wide`, which is the rule 10.3 asks `CONVENTIONS.md` to record. **8.8 is CSS and the diagnosis is the point**: `overflow-x: auto` forces `overflow-y: visible` to compute to `auto`, so `TabsTrigger`'s 5px `after` bar is real vertical overflow; the fix is `overflow-y-hidden` on the two `Tabs` roots, not in vendor `ui/tabs.tsx` whose other call sites get it free. The horizontal scrollbar legitimately stays. **8.12 needed no cast** — zod 4 takes `PAGE_VISIBILITY_VALUES` directly, as the account route's `z.array(z.enum(...))` has since Phase 5, so values now live in exactly two places as the box predicted. **8.11 was a delete**: the hook's `TelegramBindChallenge` had zero readers. 8.6/8.9/8.10 as written. 92 tests. Web: typecheck ✓, build ✓, `api:check` ✓, lint 9 = baseline, 0 findings in touched files. |
| 2026-09-30 | 9     | Dead code             | Nothing to delete, which is the finding. 9.1's three `PAGE_SIZE` literals were already gone — `my-pages.tsx` and `admins-table.tsx` read `size` from their route's `validateSearch` (Phases 5 and 6) and `course-template-tools.tsx` took `DEFAULT_PAGE_SIZE` in Phase 7, so `rg 'PAGE_SIZE\s*=\s*[0-9]'` over `src/` returns nothing. 9.2's stale comments and the duplicated `TelegramBindChallenge` went in Phase 8. 9.3 and 9.4 are guardrails rather than tasks, so they were verified instead of ticked on faith: `git log --name-only -- web/src/components/ui/` shows the directory has gained exactly one file since this plan started (`table.tsx`, in Phase 3) and lost none, and `useDeletePage` still has three live importers. A plan that ends with \"delete things\" and has nothing to delete is the plan having been written against the real code rather than an imagined version of it. |
| 2026-09-30 | 10    | CONVENTIONS.md        | Seven edits, written last so they describe the code that landed. The shared-domains list gains `table/` and `data-table/`; the width table gains the rule 10.4 asks for and the two routes 10.3 moves, which also fixed a stale `/profile` that an earlier rename to `/account` had left behind. A new **Tables** section carries the three rules the two tables established rather than a restatement of them: URL-owned page/size/sort/order with no `PAGE_SIZE` literal in a component (generalised to sort whitelists, filter lists and badge copy — one list, derived); `manualPagination`/`manualSorting` with `onSortingChange` required, because a controlled `sorting` without it renders chevrons that do nothing; and `overflow-x-auto` needing `overflow-y-hidden`, which 8.8 generalised from one bug. 10.2's note is the one most likely to be undone by a well-meaning refactor: `useDataTable` lives in `hooks/`, not beside the `DataTable` it configures, because the shared-stateful-behavior rule beats the looks-like-a-component rule. 10.7's `media` line records the sizing bug as the reason the prop takes a caller's node rather than a variant. 92 tests. Web: typecheck ✓, build ✓, `api:check` ✓, lint 9 = baseline. |

## Open questions

None blocking. If something surfaces that contradicts the decisions table,
**stop and ask the user** rather than choosing. Specifically:

- If `role=admin` disjointness turns out to conflict with how the Admins table
  presents "You" and "Owner" — those two rows are pinned outside the paginated
  set, so the counts have to agree with the filter.
- If the Meilisearch keyword path ever needs to be reachable from My Pages, it
  needs index config and a reindex, not a code change (1.14). That is a
  conversation about operational cost.
- If the Meilisearch path turns out to _not_ be skipped for My Pages (i.e. some
  caller passes `keyword`), then 1.14 becomes a real correctness bug in Phase 1,
  not a comment.
