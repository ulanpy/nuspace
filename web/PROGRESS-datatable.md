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
both currently argue *against* a `role` filter. Phase 1 tells you to rewrite
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
  `src/hooks/`, because `CONVENTIONS.md:179-183` puts shared *stateful* behavior
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

| Decision                | Value                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Datatable library       | `@tanstack/react-table` + shadcn `table` via `pnpm exec shadcn add table`              |
| Paging / sorting        | **Server-side**, driven by route `validateSearch`. Never client-side over one page.      |
| Rows per page           | 10 / 20 / 30 / 40 / 50, default 10, on **all three** paginated lists                    |
| Where the size lives    | Route `validateSearch`, values from that module's `constants.ts` — no `PAGE_SIZE` in components |
| My Pages columns        | `logo \| name (link) \| slug \| role \| visibility \| actions`                          |
| My Pages checkboxes     | **none**, and **no bulk delete**                                                        |
| My Pages role filter    | `All roles` / `Owned by me` / `Where I'm an admin`                                       |
| Admins columns          | `checkbox \| avatar \| name \| role \| actions`                                         |
| Admins selection        | bulk `Remove`; `Make owner` **only when exactly one row is selected**                   |
| Pinned rows             | "You" and "Owner", carried as react-table rows with `meta.pinned`                      |
| Sortable pages columns  | `name`, `visibility`, `created_at`. **`slug` is not sortable.**                           |
| Sortable admins columns | `name`, `created_at`                                                                     |
| Page header media       | new `Page`/`PageHeader` `media` prop; avatar on `/account`                              |
| Page widths             | `/account` and `/settings/admin-controls` → `width="wide"`                              |
| Sidebar                 | `/mynuspace` moved to first, `UserIcon` → `GlobeIcon`. **Labels unchanged.**            |
| `ui/` primitives        | all 39 unused ones **kept** — vendor code                                              |
| My Pages search box     | **none** — see the Meilisearch trap in Phase 1                                          |
| Column-visibility menu  | **none**. If columns crowd, `hidden lg:table-cell` on `slug` / `visibility`.           |
| Reset-filters button    | **none** — each `MultiFilter` clears itself                                             |

### The one semantic decision worth stating twice

`role=admin` means **administered by the viewer AND NOT owned by them**. It is
disjoint from `role=owner`.

This is not a preference. `repository.py:_list_conditions` carries a docstring
recalling that a previous `role` implementation leaked pages the viewer both
owned and administered into *both* buckets, and the fix was to delete the filter
entirely. We are re-adding the filter, so the `NOT owner` clause must be there
from the first commit. A page you own *and* administer belongs under `Owner`
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
      *and* administer appears under both Role options — the exact bug
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
      with no diff to show for it. When `sort` *is* given it replaces the whole
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
- [x] 1.15 Tests in `backend/modules/pages/tests/`:
      - [x] `test_list_pages.py` — `role=owner` excludes administered-not-owned
            and vice versa; a page owned *and* administered appears under
            `owner` only, never under `admin`.
      - [x] `test_list_pages.py` — `visibility` narrows, and combines with `role`
            by AND.
      - [x] `test_list_pages.py` — each sort column, both orders; `sort` absent
            preserves the existing chain exactly.
      - [x] `test_list_pages.py` — an unknown `sort` value is rejected.
      - [x] `test_list_admins_pagination.py` — `sort=name` stays stable across a
            page boundary (the tiebreaker concern the existing tests already
            cover for `created_at`).
      - [x] `test_page_visibility.py` — the new `visibility` filter does not
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
caller genuinely *administers* from `Where I'm an admin`. `IS DISTINCT FROM`
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
on the pages list, and an explicit `sort` is a *new* order chain, so the hole
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

- [ ] 2.1 `cd web && pnpm api:generate`. Commits `web/src/api/schema.d.ts`.
- [ ] 2.2 `web/src/api/query-keys.ts` — widen the two keys so a filter change
      cannot be served from a stale cache. A key that omits a param is the
      subtlest version of this bug: the UI looks broken only for users who
      navigated in a particular order.
      - [ ] `:32` → `mine(page, size, role, visibility, sort, order)`
      - [ ] `:41-42` → `admins(slug, page, size, excludeSub, sort, order)`
- [ ] 2.3 `cd web && pnpm api:check` must pass.

---

## Phase 3 — The DataTable layer

- [ ] 3.1 `cd web && pnpm add @tanstack/react-table`
- [ ] 3.2 `cd web && pnpm exec shadcn add table` → generates
      `web/src/components/ui/table.tsx`. **Do not hand-edit it.** `components.json`
      pins `"style": "base-nova"` and Base UI, so it will match its siblings.
- [ ] 3.3 `web/src/hooks/use-data-table.ts` — **in `hooks/`, not
      `components/shared/data-table/`** (see House rules). `manualPagination` +
      `manualSorting` over the current page of rows; `getRowId` supplied by the
      caller. **No row filtering** — that is the backend's job now, and
      duplicating it client-side is how the two drift.
- [ ] 3.4 `web/src/components/shared/data-table/data-table.tsx` —
      `DataTable` (`Table` / `TableHeader` / `TableBody` / `TableRow` /
      `TableCell` + an empty row) and `DataTableSkeleton`.
- [ ] 3.5 `web/src/components/shared/data-table/data-table-column-header.tsx` —
      sortable header button on `column.getToggleSortingHandler()`.
- [ ] 3.6 `web/src/components/shared/data-table/data-table-toolbar.tsx` — a slot
      row for the filters plus the selection-action bar.
- [ ] 3.7 `web/src/components/shared/table/pagination.tsx` — **extend, do not
      replace.** Add `pageSize` + `onPageSizeChange` and a `Select` of
      10/20/30/40/50 next to the existing chevrons. `pageRangeSummary` and
      `page-range.test.ts` are untouched.
- [ ] 3.8 **Skipped on purpose:** `DataTableSortList`. The header chevron already
      shows the one active sort, and the backend has exactly one sort key. The
      chip row would be ink for a capability that does not exist.

---

## Phase 4 — Ownership & visibility: one source of truth

Replaces `item.owner === me.sub` (`my-pages.tsx:112`),
`page.owner_user?.sub === me.sub` (`admin-controls/index.tsx:24`) and the
`pinnedSelf` inference (`admin-controls/index.tsx:33-34`).

- [ ] 4.1 `web/src/lib/pages/types.ts` — add `PageOwnership = "owner" | "admin"`,
      and **derive** `PageVisibilityValue` from
      `components["schemas"]["PageVisibility"]` instead of the hand-written union
      at `shared/pages/visibilities.ts:1`.
- [ ] 4.2 `web/src/lib/pages/constants.ts` — `PAGE_OWNERSHIP` label map,
      `PAGE_OWNERSHIP_FILTERS` (all / owner / admin), `PAGE_VISIBILITIES` as a
      `as const` tuple, `PAGE_VISIBILITY_FILTERS`, `PAGE_SIZES = [10,20,30,40,50]`,
      `DEFAULT_PAGE_SIZE = 10`. The tuple is the runtime list the zod enum needs;
      the *type* still derives from the generated schema per
      `CONVENTIONS.md:218-219`. This is the third place visibility values appear
      (see 8.12) and must be the last.
- [ ] 4.3 `web/src/lib/pages/functions.ts` — `pageOwnership(page, meSub)`: the
      only place the FK `page.owner` is compared. **Never `owner_user.sub`** —
      `backend/modules/pages/policy.py:26-28` carries its own comment saying the
      relationship is `None` on an ownerless page and that it runs on every read.
- [ ] 4.4 Same file — `ownershipLabel(o)`.
- [ ] 4.5 Same file — `myPagesQueryOptions({...})` and
      `pageAdminsQueryOptions({...})`, colocated with their fetches the way
      `pageDetailQueryOptions` (`:61-66`) already is. The two components
      currently build query options inline, so the param lists live in two
      places already.
      **Note:** `myPagesQueryOptions` was deleted in `b176a18` because it "had
      no callers, and it was a third way to ask the same question with
      `owner_sub=me`." It is being re-added here for a different reason — it
      now carries the real filter/sort params rather than a third ownership
      encoding. Do not resurrect `owner_sub`. If it still has no callers after
      Phase 5, delete it again rather than leaving it dead.
- [ ] 4.6 `web/src/components/shared/pages/visibilities.ts` — keep only the human
      copy and its helpers. Add `visibilityLabel(value)`, so both tables' cells
      read the same way.
- [ ] 4.7 `web/src/lib/pages/functions.ts:243` — **the comment is factually
      wrong.** It says "Admin only, per `PagePolicy` — the owner cannot delete
      their own club." `policy.py`'s DELETE branch and `utils.py:30-32` both grant
      the owner `can_delete`. Delete the comment. Do not change the behaviour —
      the behaviour is right and the comment is wrong.
- [ ] 4.8 `web/src/lib/pages/tests.ts` — truth table for `pageOwnership`
      alongside the existing `adminPageActions` one: FK match, FK `null` on an
      ownerless page, and a case where `owner_user.sub` disagrees with `owner` to
      prove the FK is what gets read. That last case is the regression test for
      the whole reason this helper exists.

---

## Phase 5 — My Pages table

Rewrites `web/src/components/routes/account/components/my-pages.tsx`.

Columns, in order: `logo | name (link) | slug | role | visibility | actions`

- [ ] 5.1 Column definitions for the six columns above.
- [ ] 5.2 Logo: `ResilientImage` + `selectMedia(page.media, "profile")`, the
      `rounded-md` / `size-10` treatment from `my-pages.tsx:149-154`, unchanged.
- [ ] 5.3 Name: a `<Link to="/p/$slug">` **in the cell**, not the whole row. A
      react-table row cannot be a link and still host an actions cell; the
      `Item render={<Link>}` hack (`:147`) is part of what the table replaces.
      Sortable.
- [ ] 5.4 Slug: muted text, `max-w-48 truncate`, `title={page.slug}`. Max length
      is 50 (`schema.d.ts:2747`) so truncation is rare, but a truncated cell with
      no way to read it is a real loss. Plain text, **not** a second link to the
      same place as the name. **Not sortable.**
- [ ] 5.5 Role: `secondary` Badge via `ownershipLabel(pageOwnership(...))`.
      Header reads `Role` — the rename from "ownership type", matching the Admins
      table.
- [ ] 5.6 Visibility: `outline` Badge via `visibilityLabel(page.visibility)`.
      Sortable. The `outline` / `secondary` split is deliberate so two adjacent
      badge columns do not read as one field of identical pills.
- [ ] 5.7 Actions: a `Settings` button, rendered only when the user can edit
      (`canEditField(page, "name")` — same gate as `general/index.tsx:99`, which
      uses `canEditField(page, "visibility")`), and a `Delete` button, rendered
      only when `page.permissions.can_delete`. Use the same responsive button
      pair pattern as `admins-table.tsx:280-335`. **No bulk path, no multi-page
      confirm dialog.**
- [ ] 5.8 Toolbar row — two `MultiFilter`s plus the button, one row:

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
- [ ] 5.9 Role filter options: `All roles` / `Owned by me` /
      `Where I'm an admin`. An empty selection omits the param entirely.
- [ ] 5.10 Visibility filter options, labelled from the same copy the picker uses
      — one label set, or the picker bug in 8.4 comes back.
- [ ] 5.11 Empty state branches on whether any filter is active: with filters,
      "No pages match your filters" plus a clear action; without, "No pages yet"
      plus create. Do **not** issue a second unfiltered request to learn the true
      total — that doubles the queries on the slowest screen. The one
      inaccuracy is accepted: a genuinely empty account with a filter on reads
      as "no pages match your filters", which is a harmless wrong sentence.
- [ ] 5.12 Note the `?page=` empty-value hazard for Phase 7: this route's
      `validateSearch` has **no** `.catch(1)` on `page`, so a bare `?page=` fails
      validation. `admin-controls/index.tsx:9-15` documents the fix.

---

## Phase 6 — Admins table

Rewrites
`web/src/components/routes/pages/settings/components/admins-table.tsx`.

Columns, in order: `checkbox | avatar | name | role | actions`

- [ ] 6.1 **The pinned rows.** "You" and "Owner" cannot live outside the table
      body: the owner is not in the admins list, and "You" is removed via
      `exclude_sub` so the counts line up. Feed them to react-table as rows with
      `meta.pinned` — sorted first, selection disabled on them.
      `pageRangeSummary(data, pinned)` already exists for exactly this case and
      has a test at `page-range.test.ts:31`; keep passing the pinned count. Do
      not "simplify" it to a plain count, or the footer will claim more admins
      exist than the table can page through.
- [ ] 6.2 Checkbox column: bulk `Remove` on the selection; `Make owner` offered
      **only when exactly one row is selected** — you cannot make three admins
      the owner at once, and the button must not merely look disabled.
- [ ] 6.3 Avatar: reuse the pattern already working at
      `admins-table.tsx:264-272` — `ItemMedia`'s sizing is irrelevant in a table
      cell, so this becomes `Avatar` / `AvatarImage` / `AvatarFallback` with
      `initialsOf(name, surname)`.
- [ ] 6.4 Name: sortable. Keep the `initialsOf` helper (`:39`).
- [ ] 6.5 Role: `secondary` Badge — `You` / `Owner` / `Admin`.
- [ ] 6.6 Actions: port the existing inline responsive pairs (`:280-335`) into a
      `TableCell`. Copy the logic, not the markup.
- [ ] 6.7 `adminPageActions()` (`lib/pages/functions.ts:382-390`) stays the sole
      gate, and the bulk bar calls it too. Do not re-derive the rules in the
      component — that is how the two copies diverge.
- [ ] 6.8 Delete `pinnedSelf` (`admin-controls/index.tsx:33-34`). That 6-line
      inference (`can_edit && !can_manage_admins` ⇒ "I am a plain admin") exists
      only to decide whether to pass the `me` prop. Always pass `me` and let
      `pageOwnership` decide per row.
- [ ] 6.9 `web/src/components/routes/pages/settings/admin-controls/index.tsx:24`
      (`isCurrentUserOwner`) routes through `pageOwnership` too.
- [ ] 6.10 Add `sort` / `order` wiring to the route's search and the component.

---

## Phase 7 — Route search schemas

- [ ] 7.1 `web/src/routes/_app/account/index.tsx` — `page`, `size`
      (`PAGE_SIZES`, `DEFAULT_PAGE_SIZE`), `role`, `visibility` (array), `sort`,
      `order`. Add `.catch(1)` to `page`, copying the comment from
      `admin-controls/index.tsx:9-15`.
- [ ] 7.2 `web/src/routes/_app/p/$slug/settings/admin-controls/index.tsx` —
      add `size`, `sort`, `order`. Keep its existing `.catch(1)`.
- [ ] 7.3 The course-templates route — add `size`. It is the third hardcoded
      `PAGE_SIZE` at
      `components/routes/courses/components/course-template-tools.tsx:25`.
- [ ] 7.4 `size`, `role`, `visibility`, `sort` and `order` must each reset `page`
      to 1. Landing on page 7 of a 2-page result is the classic symptom of
      missing this.
- [ ] 7.5 `visibility: z.array(z.enum([...])).optional()` — this exact shape
      already exists at `routes/_app/opportunities/index.tsx:13-16` (paired with
      four `MultiFilter`s at `:487-523`) and `routes/_app/courses/audit/index.tsx:17-18`.
      Follow it; do not invent a URL encoding.
- [ ] 7.6 The two `onSearchChange` signatures diverge today — account takes
      `(updater, replace?)`, admin-controls does not. Make them match.

---

## Phase 8 — The small fixes

These are independent of the tables and could be done in any order. They are
collected here because they were found in the same pass.

- [ ] 8.1 **Avatar on `/account` — fixed by deleting the broken markup.**
      `components/routes/account/index.tsx:58-77` puts a `size-12 rounded-full`
      `ResilientImage` inside `ItemMedia variant="image"`, which hardcodes
      `size-10 overflow-hidden rounded-sm` (`ui/item.tsx:90-91`). The inner box is
      *larger than its clipper*, so the `rounded-full` never reads and the picture
      is cropped to a rounded rectangle. 8.2's `media` prop removes the
      `ItemMedia` entirely; `Avatar` is already `rounded-full` and self-sizing,
      so no class overrides are needed. `ResilientImage` stays — it is still used
      for the page logo and in `page-card.tsx`.
- [ ] 8.2 **`Page` gains a `media` prop.**
      `components/shared/page/header.tsx:27` — the existing `<div>` becomes a
      flex row, with the inner text block kept at `flex-1` so pages *without*
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
- [ ] 8.3 **Rewrite `/account`'s header and sections**
      (`components/routes/account/index.tsx`):
      - [ ] `eyebrow="Account"`, `title={me.name}`, `description={me.email}`,
            `media={<Avatar size="lg">…</Avatar>}`, `width="wide"`. The eyebrow
            uses the slot that already exists at `header.tsx:29`, so the route
            keeps its name while the `h1` is the person.
      - [ ] Delete the page description (`:48-49`) and the duplicate
            `SettingsSection title="Account"` + its description (`:52-55`). The
            word "Account" currently appears as an `h1` and an `h2` ~30px apart,
            and the two descriptions say the same thing.
      - [ ] Rename the section to **"Integrations"**. The Telegram `Item` stays,
            `ItemGroup` and all — the group is one `div` today and is what gives
            the second integration its gap.
      - [ ] **Do not** make `SettingsSection`'s `title` optional
            (`settings/settings-section.tsx:6`). It stays required.
- [ ] 8.4 **Visibility labels: the trigger and the dropdown disagree.**
      `shared/pages/visibility-picker.tsx:45-56` passes no `items` to
      `Select.Root`, so base-ui falls back to rendering the raw value and the
      `capitalize` class on the trigger at `:55` shows **"Internal"** while
      `SelectItem` at `:61` shows **"NU only"**. Fix: pass
      `items={{ public: "Public", internal: "Members only", private: "Private" }}`
      to `Select.Root` and drop `capitalize`. One label set everywhere.
- [ ] 8.5 **Simplify the visibility copy** (`shared/pages/visibilities.ts`) —
      `Public` / `Members only` / `Private`, one short line each. Remove
      "Outsiders see a 404." (`:14`): a 404 is a transport detail, not something
      a user needs. Also drop the 404 mention in `general/index.tsx:102`.
- [ ] 8.6 Sidebar (`components/layouts/app/app-sidebar.tsx:51-57`) — move
      `/mynuspace` to first position in `NAV_ITEMS`, `UserIcon` → `GlobeIcon`.
      **Labels unchanged.**
- [ ] 8.7 **"Admin access link" into an `Item`.**
      `components/routes/pages/settings/components/admin-access-link.tsx` —
      wrap in `Item variant="muted"`, read-only `Input` in `ItemContent`, Copy
      and Rotate in `ItemActions`, drop the `SettingsSection` description (the
      comment at `:36-39` explains why there was *no* `Item`; it goes with it).
      Also clear the un-cleared `setTimeout` at `:28` on unmount — it fires
      `setCopied` on an unmounted component.
- [ ] 8.8 **FilterTabs scrollbars — found, and it is not an overflow bug.**
      `ui/tabs.tsx:62` gives `TabsTrigger` an `after:bottom-[-5px] after:h-0.5`
      bar that nothing clips. `FilterTabs` (`shared/list-filters.tsx:81`) and
      `RouteTabs` (`shared/route-tabs.tsx:46`) both put `overflow-x-auto` on the
      `Tabs` **root**, and per CSS `overflow-x: auto` forces `overflow-y: visible`
      to compute to `auto` — that 5px bar is real scrollable overflow, hence the
      vertical scrollbar. Fix: add `overflow-y-hidden` to both. The horizontal
      scrollbar is legitimate (the `TabsList` cannot shrink below its content)
      and stays. Do not "fix" this by editing `ui/tabs.tsx` — it is vendor code
      and the other two call sites get it for free.
- [ ] 8.9 `components/routes/mynuspace/index.tsx:42-44` — delete the stale
      `include_private: false` comment. That parameter no longer exists anywhere;
      the exclusion now lives in `repository.py:_list_conditions`. The comment
      actively misleads: it reads like a caller is passing it.
- [ ] 8.10 `components/routes/pages/settings/general/index.tsx:46` — "Put the
      radio back where it was." There is no radio; it is a `Select`.
- [ ] 8.11 **Duplicated `TelegramBindChallenge`** —
      `lib/user/types.ts:17-20` and `hooks/use-connect-telegram.ts:38-41` are
      two shapes with one name. Collapse to one.
- [ ] 8.12 `shared/pages/page-form.tsx:35` — the hand-written
      `z.enum(["public", "internal", "private"])`. zod 4 needs a literal tuple, so
      it cannot derive from the generated union; point it at `PAGE_VISIBILITIES`
      from `lib/pages/constants.ts` so there is one list. After this, visibility
      values exist in exactly two places: the derived *type* (schema) and the
      runtime *tuple* (constants).

---

## Phase 9 — Dead code

- [ ] 9.1 Remove the three hardcoded `PAGE_SIZE` literals — now covered by
      `PAGE_SIZES` / `DEFAULT_PAGE_SIZE`: `my-pages.tsx:31`,
      `admins-table.tsx:37`,
      `components/routes/courses/components/course-template-tools.tsx:25`.
- [ ] 9.2 Remove the stale comments and duplicates listed in 8.9–8.12.
- [ ] 9.3 **Do not delete anything from `web/src/components/ui/`.** 39 primitives
      have no importer — `sidebar.tsx` (the app hand-rolls its own rail in
      `app-sidebar.tsx`), `toast.tsx` (the app uses `sonner` directly),
      `alert-dialog.tsx` (every confirm goes through `shared/confirm-dialog.tsx`),
      plus `accordion`, `chart`, `carousel`, `drawer`, `command` and ~32 more.
      `CONVENTIONS.md:96-105` calls `ui/` vendor code owned by shadcn; these
      arrived via `shadcn init`, and `table.tsx` is arriving from the same
      registry in Phase 3. Deleting them would leave the next `shadcn add`
      unable to resolve a dependency. This was explicitly ruled in.
- [ ] 9.4 Do not remove `useDeletePage` — it is still live through the Danger
      zone at `general/index.tsx:158`.

---

## Phase 10 — `web/CONVENTIONS.md`

Last, so the document describes the code that landed. Seven edits:

- [ ] 10.1 `shared/table/` and `shared/data-table/` are missing from the shared
      -domains list (`:81-89`).
- [ ] 10.2 Note that `useDataTable` lives in `src/hooks/`, not beside the
      component — `CONVENTIONS.md:179-183` puts shared *stateful* behavior in
      `hooks/`, and putting it in `components/shared/` would have looked right
      and been wrong.
- [ ] 10.3 Move `/account` and `/settings/admin-controls` to `wide` in the
      assignment table (`:138-145`). Six columns do not fit in `prose`.
- [ ] 10.4 A new rule: a page hosting a datatable is `wide`.
- [ ] 10.5 Styling: `overflow-x-auto` must be paired with `overflow-y-hidden` or
      `overflow-y-clip`. This is 8.8 generalised from one bug to a rule.
- [ ] 10.6 Pagination `size` comes from the route's `validateSearch`, and the
      allowed values from that module's `constants.ts` — no `PAGE_SIZE` literals
      in components.
- [ ] 10.7 The page-layout section documents the header as "the title, spanning
      the box" (`:113-115`). Add a line for the `media` prop and the
      avatar-in-header pattern.

---

## Progress log

Append one line per ticked box. Newest at the bottom.

| Date       | Phase | What                    | Notes                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ----- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —          | —     | Plan written            | `web/PROGRESS-datatable.md` created. No code changed yet. Sibling of `web/PROGRESS.md`, which is live and untouched.                                                                                                                                                                                                                                                                                                       |
| —          | —     | Plan corrected          | Phase 1 was found to reverse `b176a18`, which removed the `role` filter and the `mine` visibility clause two commits earlier. **The user confirmed the reversal is intentional.** Added a "Read this first" section carrying the three historical bugs, and turned 1.8/1.9 from "rewrite these docstrings" into "rewrite but preserve the history in them". Line refs re-verified against the tree: `_list_conditions` `:108`, `mine` branch `:136`, `list_pages` `:151`, `meili` short-circuit `:165-177`, `order_clause` `:190-194`, order chain `:206-211`, `list_admins_page` `:241`.   |
| 2026-09-30 | 0     | Pre-flight              | `web/PROGRESS.md` Phase 4 **fully ticked** — no race. Phases 5/6/7 open and staying open (docs / prod push / deferred). Baseline commit `fea3b84`. Four pre-existing reds fixed, all detailed above: the `fastapi` container had not booted in two days (`openai` missing from the stale `fastapi-venv` volume, so `api:check` was unrunnable), `schema.d.ts` 434 lines behind on the `agent` module, ruff 16 not 11 (the extra 5 in `modules/pages/`), and black red on two more pages files. **Green now: backend 209 tests, ruff 11, black ✓. Web 83 tests, typecheck ✓, build ✓, lint 9 = baseline, `api:check` ✓.** Note `pnpm api:check` runs on the host here, so `OPENAPI_URL=http://localhost/api/openapi.json`; the file's `http://nginx/…` advice only applies from inside the `web` container. |
| 2026-09-30 | 1     | Backend role/vis/sort   | `df94076`. Reverses `b176a18`'s `role` removal. `role=admin` is `administered AND NOT owned`, via `is_distinct_from` not `!=` (nullable `pages.owner` — `!=` would hide an ownerless page you administer). `PageRole`/`PageSort`/`PageAdminSort` enums, so FastAPI 422s an unknown value and the whitelist dict is keyed by the same members. `sort=None` leaves the order chain byte-for-byte; an explicit sort replaces it whole, owner-first prefix dropped, `pages.id` tiebreaker added. The two chains are now classmethods (`_page_order_clauses`, `_admin_order_clauses`) so the tests call the real query like `_where` does. Three docstrings rewritten **with** their history, not deleted. Meilisearch silent-ignore commented at both ends. No `role`/`visibility` on the admins endpoint. **237 backend tests (was 209), ruff 11 = baseline, black ✓.** Disjointness confirmed red twice: `!=` → 3 failures, clause deleted → 4 failures. |

## Open questions

None blocking. If something surfaces that contradicts the decisions table,
**stop and ask the user** rather than choosing. Specifically:

- If `role=admin` disjointness turns out to conflict with how the Admins table
  presents "You" and "Owner" — those two rows are pinned outside the paginated
  set, so the counts have to agree with the filter.
- If the Meilisearch keyword path ever needs to be reachable from My Pages, it
  needs index config and a reindex, not a code change (1.14). That is a
  conversation about operational cost.
- If the Meilisearch path turns out to *not* be skipped for My Pages (i.e. some
  caller passes `keyword`), then 1.14 becomes a real correctness bug in Phase 1,
  not a comment.
