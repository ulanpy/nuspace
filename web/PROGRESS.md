# PROGRESS — Puck editor for user profile pages

**Status:** phases 0 and 1 landed — the login landmine is defused and the
three profile endpoints are live and verified against the dev database
**Scope:** `backend/` and `web/`. This is the one plan here that is not
frontend-only: it adds a migration, three endpoints, an `EntityType` value and
an upload authorizer.

This file is a self-contained brief. An agent picking this up cold should not
need any of the conversation that produced it.

---

## How to use this file

1. Read `web/CONVENTIONS.md` in full before touching anything frontend. It is
   binding.
2. Read the "Decisions locked" section below. They are settled — do not
   re-litigate them, and do not substitute your own.
3. **Read "Corrections to the original brief" before writing a line of code.**
   Two of the plan's premises are wrong, and one of them will silently destroy
   user data if you miss it.
4. Work the phases top to bottom. Each phase leaves the tree green.
5. **Tick a checkbox `[x]` the moment that item is done and verified.** Not
   when you start it.
6. Before resuming after a break, run the verification commands in
   "Resume protocol" and then `git diff` to see what actually landed.
7. If reality forces a change to this plan, edit this file in the same commit
   and note it under "Deviations" at the bottom. Do not silently diverge.

**Commands.**

```sh
# backend — from backend/
uv run ruff check .
uv run black --check .
PYTHONPATH="$(dirname "$PWD")" uv run python -c "
from dotenv import load_dotenv
load_dotenv('../infra/.env')
import pytest, sys
sys.exit(pytest.main(['-q']))"
```

```sh
# web — from web/
pnpm api:check        # requires a running backend
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
pnpm build            # also regenerates routeTree.gen.ts
```

The `pytest` invocation is deliberately awkward — `backend/` itself is the
importable package so its **parent** must be on `PYTHONPATH`, and
`core.configs.Config` needs ~25 variables out of `infra/.env`. Load the env
in-process; do **not** `source infra/.env`, two of its values are unquoted and
abort `zsh`. The container is not a fallback: `backend/Dockerfile` runs
`uv sync --frozen --no-dev`, so pytest/ruff/black are not in the image.

**Lint is red before you start.** `pnpm lint` exits 1 on a pre-existing
baseline of **9** errors in `layouts/app/app-sidebar.tsx`,
`routes/announcements/index.tsx` and `routes/events/`. `uv run ruff check .`
has a baseline of **11**. The bar here is *no new findings from the files this
plan touches*, not a green run. Diff the finding list before and after.

---

## Corrections to the original brief

The request assumed two new columns on `users`. They already exist.

1. **`users.page_content` (JSONB) and `users.is_page_public` (bool) are
   already in the model** — `backend/modules/auth/models.py:37-38`, added by
   migration `8b32e85c3697`. **Do not add them and do not write a migration
   that adds them.**

2. **They are destroyed on every login, and this is the load-bearing bug of
   the whole plan.** `UserRepository.upsert`
   (`backend/modules/auth/repository.py:20-22`) copies every `UserSchema` field
   onto an existing row, and `UserSchema` (`schemas.py:17-18`) defaults
   `page_content={}` / `is_page_public=False`. `{}` and `False` are both
   non-`None`, so they pass the `value is not None` guard and get written onto
   the row on **every Keycloak callback**. Without the phase 0 fix, a user
   designs their page, signs in, and finds it wiped and unpublished. Phase 0
   ships first for this reason.

3. **There is no `PATCH /users/me`.** `backend/modules/auth/api.py` exposes
   `GET /me` (`:151`) and an admin-only `PATCH /users/{sub}/scope` (`:187`).
   Nothing can currently write a user's slug, page or visibility.

4. **There is no public profile route.** No `/u/$slug`, nothing. The only page
   rendering `page_content` is `/communities/$slug`.

5. **Avatar and banner upload is the one part that is not "straightforward
   reusing the existing things."** `media.entity_id` is `BigInteger`
   (`backend/modules/media/models.py:45`), `get_media_metadata` does
   `int(...)` on the GCS metadata (`google_bucket/dependencies.py:129`),
   `EntityType` has no `users` value, and there is no users upload authorizer
   — while `users.sub` is a Keycloak UUID string. Decision #1 resolves it.

Everything else *does* reuse cleanly: `MediaPicker`, `selectMedia`,
`saveWithMedia`, and `MediaAttachmentResolver.map_to_resources` all key off
`getattr(resource, "id")`, which is exactly what the surrogate column provides.

---

## Decisions locked

Decided with the user. Change them only if asked.

| #   | Decision                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **User media keys off a surrogate `users.id` BigInteger**, sequence-backed, unique, backfilled. `sub` stays the PK and every FK to `users.sub` is untouched. The alternative — widening `media.entity_id` to `Text` — was rejected because every existing media consumer compares `entity_id` against an int. |
| 2   | **The template dialog gains a second source: public people.** Communities stay listed **unfiltered**, because communities have no public/private flag at all and adding one is a separate feature nobody asked for. |
| 3   | **The sidebar page is a directory of public profiles, and its label is literally "My Nuspace."** The name was flagged as confusing for a list of other people; the user chose to keep it. Do not rename. |
| 4   | **Public profiles live at `/u/$slug`.** Non-owners — guests included — get a **404** on a private page, never a redirect to login. `/profile/*` keeps its existing redirect-to-`/` guard. |
| 5   | **Settings fields use a mixed `Item` layout:** text inputs (`name`, `slug`, `email`) go full-width in `ItemContent` under the title and description; small controls (`Switch`, `Select`, `Button`) go in `ItemActions`. `ItemActions` is a bare `flex items-center gap-2`, so a full-width `Input` dropped in there looks cramped. |
| 6   | **`Item` conversion covers everything**: form fields, the admin access link, the danger zone, and the admins table rows. The danger zone and the admin table are both already label-left/control-right, so both are near-mechanical swaps. |
| 7   | **Community General goes single-column.** The current 2-column grid is dropped and is **not** replaced for Type + Category. Full-width inputs, one column. |
| 8   | **`CommunityForm` is restyled for both consumers.** It is shared with `CommunityFormDialog` on `/communities`, so the create dialog changes too. Splitting the markup was considered and rejected — it would duplicate a 374-line form for no product gain. |

---

## What exists to reuse

Read these before writing anything. Most of this plan is assembly, not
invention.

| Need                          | Reuse                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Puck editor shell             | `shared/page-editor/components/editor.tsx` — no change at all                                     |
| Template apply + its 6 tests  | `shared/page-editor/components/_lib/template.ts` — takes `(page_content, config)`, unchanged     |
| Template picker chrome        | `shared/page-editor/components/template-dialog.tsx` — add a source switch                        |
| Editor route wiring           | `components/routes/communities/editor/index.tsx:54-66` — copy, swap the upload context          |
| Pagination footer             | `components/routes/communities/settings/components/admins-table.tsx:155-213` — extract, do not copy |
| Page param in the URL         | `routes/_app/communities/$slug/settings/admin-controls/index.tsx:8-17` — `.min(1)` before `.catch(1)` |
| Page in the query key         | `web/src/api/query-keys.ts:26-36` — the comment there is the rule                                    |
| Slug-taken 409                | `backend/modules/campuscurrent/communities/api.py:20-27`                                           |
| Generic `setattr` update loop | `backend/modules/campuscurrent/communities/repository.py:37-50`                                     |
| Media delete + attach         | `MediaAttachmentResolver`, `communities/service.py:106-107, 240-270`                                |
| Public-page rendering         | `components/routes/communities/$slug/index.tsx:57-86` (root colour tint) and `:263` (`PageRenderer`) |
| Settings layout + tabs        | `routes/_app/communities/$slug/settings/route.tsx` + `components/layouts/settings/index.tsx`       |
| `saveWithMedia`               | `web/src/lib/media/functions.ts:150` — an upload failure must not lose the form                     |
| Two-zone upload items         | `toCommunityUploadItems`, `web/src/lib/communities/functions.ts:106-122`                             |
| Shared validation to extract   | `SLUG_PATTERN` + `RESERVED_SLUGS` at `components/routes/communities/components/community-form.tsx:28-72` and `backend/modules/shared/slug.py:6-25` |

**Deterministic ordering matters for the new user list.** There is no
Meilisearch index for users, so it is plain SQL. `ORDER BY name, surname, sub`
is required, not cosmetic — OFFSET over a non-deterministic order drops and
repeats rows across page boundaries. See the comment at
`communities/repository.py:202-224` for the same reasoning on the admins query.

---

## Phases

### Phase 0 — migration + the login landmine

Do this phase first and alone. Everything after it is unsafe without 0.2.

- [x] 0.1 Migration `backend/migrations/versions/b3c4d5e6f7a8_user_page_owner.py`,
      `down_revision = "a1b2c3d4e5f6"` (current head,
      `a1b2c3d4e5f6_community_admins.py`). Confirm the head is still that with a
      grep over `migrations/versions/*.py` before writing it.
      - `users.id` — `BigInteger`, sequence-backed, `NOT NULL`, unique.
        Existing rows backfilled with `nextval`.
      - `ALTER TYPE entity_type ADD VALUE 'users'`. Alembic cannot detect enum
        value changes; this line is manual by design
        (`media/models.py:13-20`).
      - **PG caveat:** `ALTER TYPE ... ADD VALUE` cannot run inside a
        transaction block on PG < 12. If the target PG is older, wrap it in
        `op.get_context().autocommit_block()`. The value is not read in this
        migration, so on PG 12+ it is safe in-transaction.
- [x] 0.2 **`backend/modules/auth/repository.py:20-22` — the actual bug.**
      Exclude locally-owned fields from the upsert copy loop:
      `LOCAL_FIELDS = {"page_content", "is_page_public", "slug"}`. `slug` is
      already handled specially at `:33-37` and must not be clobbered either.
      Add a comment saying *why*: these are user-owned, not Keycloak claims.
- [x] 0.3 `backend/modules/media/models.py` — add `users = "users"` to
      `EntityType`; add `id: Mapped[int]` to `User` (`models.py:26`).
- [x] 0.4 `backend/modules/shared/slug.py:6-25` — add `"u"` to
      `RESERVED_SLUGS` so no profile slug can shadow `/u/$slug`.
- [x] 0.5 Verify: `uv run ruff check .` shows no new findings; migration
      applies and downgrades cleanly against a real database.

### Phase 1 — backend profile read/write

- [x] 1.1 New `backend/modules/auth/profiles.py` holding the service and
      policy for profile pages, so `service.py` does not grow. It needs a
      `UserRepository.get_by_id` and a `list_public` alongside the existing
      methods.
- [x] 1.2 `GET /api/u/{slug}` → `UserPageResponse { sub, name, surname, slug,
      picture, page_content, media[] }`. **404** when not found, when
      `is_page_public` is false, or when `scope == banned` — *unless* the
      viewer's `sub` matches, so the owner can always preview their own page.
      `get_creds_or_guest`, mirroring `communities/api.py:89`.
- [x] 1.3 `GET /api/users?keyword=&page=&size=` → the same
      `{items, total_pages, total, page, size, has_next}` shape as
      `communities/schemas.py:173-188`.
      - **Filter on `is_page_public` and `scope == allowed` as a hard `WHERE`,
        never as a caller-supplied query parameter.** A parameter would let
        anyone enumerate private pages.
      - `keyword` → `ILIKE` over `name`/`surname`.
      - `ORDER BY name, surname, sub` — see "What exists to reuse".
- [x] 1.4 `PATCH /api/users/me` — body `{ slug?, page_content?,
      is_page_public?, media_ids_to_delete? }`, self only
      (`get_creds_or_401`, compare against the session `sub`). Generic
      `setattr` loop like `communities/repository.py:37-50`. Media deletion
      reuses `communities/service.py:124-147`, which already checks
      `entity_type` + `entity_id` before deleting.
      `IntegrityError` → **409** with `SLUG_TAKEN_DETAIL`
      (`communities/api.py:20-27`).
- [x] 1.5 Extend `/api/me` (`auth/api.py:151`) to also return `slug`,
      `page_content`, `is_page_public` and `media` — one dict in
      `service.py:376-381`. The General tab reads the session, so this is the
      only read endpoint it needs.
- [x] 1.6 Backend tests (see "Verification"):
      - `upsert` on an existing user **preserves** `page_content` and
        `is_page_public`. This is the regression that silently destroys work.
      - `PATCH /users/me` rejects a duplicate slug with 409, and rejects
        another user's `sub` with 403.
      - `GET /users` never returns a private or a banned user.
- [x] 1.7 Verify: ruff + black + the new pytest cases pass.

### Phase 2 — media uploads for users

- [x] 2.1 `CampusCurrentMediaUploadAuthorizer`
      (`backend/modules/google_bucket/service.py:11-39`) — add a `users` branch
      → `authorize_user_media_upload(entity_id, user)`: load the user by `id`,
      require `user.sub == session_sub` and `scope != banned`. Wire it in
      `google_bucket/dependencies.py:33-37`.
- [x] 2.2 Web: `toUserUploadItems`, mirroring `toCommunityUploadItems`
      (`lib/communities/functions.ts:106-122`) — same `profile`/`banner`
      formats, per-format `mediaOrder` counters.
- [x] 2.3 Web: `useUpdateMe()` in `web/src/lib/user/functions.ts`, routed
      through `saveWithMedia` (`lib/media/functions.ts:150`) so a failed upload
      batch does not discard the form. Extend `CurrentUser` in
      `lib/user/types.ts` with the four fields from 1.5.
- [x] 2.4 `pnpm api:generate` against a running backend; commit
      `web/src/api/schema.d.ts` **in the same commit** as the backend change.
- [x] 2.5 Verify: `pnpm api:check && pnpm typecheck && pnpm test && pnpm lint`

### Phase 3 — frontend API layer

- [x] 3.1 `qk.users = { all, list(filters), detail(slug), mine }` in
      `web/src/api/query-keys.ts`. `page` belongs **in the key**, not inside
      it — the comment at `:26-36` is the rule.
- [x] 3.2 `web/src/lib/user/functions.ts` — `fetchUsersPage`, `fetchUserPage`,
      `useUpdateMe`. Types come from the regenerated `schema.d.ts`; do not
      hand-write them.
- [ ] 3.3 Verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`

### Phase 4 — `/profile` becomes a two-tab settings area

`/profile` is currently a leaf route using `SettingsShell` *because* it has no
child routes. It gets a layout, mirroring
`routes/_app/communities/$slug/settings/route.tsx`.

```
routes/_app/profile/route.tsx            SettingsLayout, tabs General / My communities
routes/_app/profile/index.tsx            → redirect /profile/general
routes/_app/profile/general/index.tsx
routes/_app/profile/communities/index.tsx
routes/_app/profile/editor/index.tsx     Puck editor
```

- [ ] 4.1 `routes/_app/profile/route.tsx` — keep the existing
      redirect-to-`/` guard from `routes/_app/profile/index.tsx:8-12` verbatim.
      `SettingsLayout` with the two tabs. Actions: **Design page**
      (`PaletteIcon` → `/profile/editor`, copying `settings/route.tsx:54-62`)
      and the existing **Log out**.
- [ ] 4.2 `routes/_app/profile/index.tsx` — redirect to `/profile/general`,
      as `communities/$slug/settings/index.tsx:3-4` does.
- [ ] 4.3 **General tab**, an `ItemGroup` per decision #5:
      - Account row — `ItemMedia variant="image"`, uploaded avatar with the
        Keycloak `picture` claim as the `ResilientImage` fallback, name +
        email.
      - Avatar upload — `MediaPicker`, `aspectRatio="square"`, `maxFiles={1}`.
      - Banner upload — `MediaPicker`, `aspectRatio="video"`, `maxFiles={1}`.
      - URL row — full-width `Input` in `ItemContent`; the description
        previews `/u/{slug}`. Extract the `SLUG_PATTERN` + reserved-word
        validation into a shared module rather than copying
        `community-form.tsx:28-72`. Add `"u"` to the frontend copy.
      - Public page row — `Switch` in `ItemActions`, description explaining
        that the page is only reachable at `/u/{slug}` while it is off.
      - Edit page button row.
      - **Delete the Appearance row** (`components/routes/profile/index.tsx:180-182`).
        The `ThemeToggle` is redundant here: `app-sidebar.tsx` already renders
        it in **three** places — `:336` in the header when expanded, `:357` on
        the collapsed rail, `:388` in the mobile sheet. All three are chrome;
        the profile row was the only content-level copy. The row and its now-
        unused `ThemeToggle` import both go.
- [ ] 4.4 **My communities tab** — no new backend endpoint.
      `fetchCommunitiesPage({ owner_sub: "me" }, { page, size })` already
      paginates. `page` in the URL via `validateSearch`
      (`.min(1).catch(1)`, per `admin-controls/index.tsx:8-17`). Rows mirror
      `AdminRowView`; **no share link**, actions limited to "Open".
      - Extract the footer at `admins-table.tsx:155-213` into one shared
        `TablePagination` component. Do not duplicate 60 lines of pagination
        markup into a third file.
- [ ] 4.5 Verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`

### Phase 5 — editor + public page

- [ ] 5.1 `routes/_app/profile/editor/index.tsx` — copy
      `components/routes/communities/editor/index.tsx:54-66`: loader ensures
      the session, `UploadContext.Provider` with `entityType: "users"` and
      `entityId: user.id` (the new int from phase 0), publish through
      `PATCH /users/me`, invalidate `qk.users.all()`, navigate back.
      - `UploadContextData.entityId` is typed `number`
        (`shared/page-editor/context.tsx:4-12`). Phase 0 is what makes this
        legal.
- [ ] 5.2 `routes/_app/u/$slug/index.tsx` + its component — the public
      profile. `PageRenderer` on `page_content`, mirroring
      `components/routes/communities/$slug/index.tsx:57-86` (root bg/text tint
      on the app header) and `:263`. Keep the optional-viewer pattern.
      - `404` maps from the API 404 via the same `ApiError` handling
        `communities/$slug/index.tsx:8-40` uses.
      - Lives under `_app`, not `_public`: `routes/_app/route.tsx:6-15`
        deliberately leaves browsing anonymous, which is what decision #4 needs.
- [ ] 5.3 Verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`

### Phase 6 — template dialog

- [ ] 6.1 `shared/page-editor/components/template-dialog.tsx` — add a section
      switch above the list, driven by one shared `keyword` box. The people
      source calls `fetchUsersPage`; the community source is unchanged and
      **unfiltered** (decision #2). Reuse the existing `hasDesign()` check for
      both shapes, and the existing empty/pending/error copy per source.
- [ ] 6.2 `applyTemplate` and its 6 tests in
      `shared/page-editor/components/_lib/template.test.ts` are **untouched** —
      it already takes `(page_content, config)`. They must stay green.
- [ ] 6.3 Verify: `pnpm test && pnpm typecheck && pnpm lint`

### Phase 7 — "My Nuspace" sidebar page

- [ ] 7.1 `{ to: "/people", label: "My Nuspace", icon: UserIcon }` in
      `NAV_ITEMS` (`web/src/components/layouts/app/app-sidebar.tsx:50-56`).
      `to` is typed `LinkProps["to"]`, so the route must exist before the
      entry does or the build fails.
- [ ] 7.2 `routes/_app/people/index.tsx` + component — `communities/index.tsx`
      minus the two `FilterTabs`. `SearchFilter` stays, `useInfiniteList` +
      `InfiniteList` + `CardGrid` stay, `UserCard` replaces `CommunityCard`,
      empty state included. No filters.
- [ ] 7.3 Cards link to `/u/$slug`; avatar falls back to initials, the way
      `profile/index.tsx:157-165` does.
- [ ] 7.4 Verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`

### Phase 8 — `Item` across both settings areas

Decision #6: everything, not just the fields.

- [ ] 8.1 **Community General** — name, type, category, slug, email → `Item`
      rows, mixed layout per decision #5. `MediaPicker` rows. The 2-column
      grid goes to one column, **not** replaced for Type + Category
      (decision #7). The danger zone (`general/index.tsx:78-98`) is already
      label-left/button-right, so it is a near-mechanical swap to
      `<Item variant="outline">` keeping the destructive classes.
      `CommunityForm` is shared with `CommunityFormDialog`, so the create
      dialog restyles too (decision #8).
- [ ] 8.2 **Admin access link** — `settings/components/admin-access-link.tsx`
      → `Item` rows. Read-only `Input` + copy + rotate, both
      `ConfirmDialog`-gated. Logic unchanged; markup only. Leave the
      `qk.adminLink` key out of the `communities` prefix as its comment
      (`query-keys.ts:38-46`) requires.
- [ ] 8.3 **Admins table rows** — `AdminRowView`
      (`admins-table.tsx:300-381`) → `Item` with `ItemMedia variant="image"`,
      `ItemTitle` + `Badge`, actions in `ItemActions`. The
      `<Card><div className="divide-y">` wrapper becomes an `ItemGroup`.
      `adminRowActions()` gating (`lib/communities/functions.ts:390-398`) and
      the responsive labelled/icon-only button pair are unchanged. The
      `excludeSub` reasoning at `:74-78` must survive verbatim — the pinned
      "You" row is why the server drops them from the rows *and* the count.
- [ ] 8.4 Pagination footer untouched beyond the phase 4.4 extraction.
- [ ] 8.5 Verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`

### Phase 9 — final

- [ ] 9.1 Full backend suite + ruff + black.
- [ ] 9.2 Full web suite: `pnpm api:check && pnpm typecheck && pnpm test &&
      pnpm lint && pnpm format:check && pnpm build`.
- [ ] 9.3 Walk the self-check below by hand in a browser, not just by reading
      the diff: design a page as a user, log out, log back in, confirm the
      design survived. That round trip is the one thing no automated test here
      covers end to end, and it is the bug that motivated phase 0.
- [ ] 9.4 Commit. Suggested message:
      `feat(web,backend): Puck page editor for user profile pages`

---

## Not in scope

Considered and explicitly deferred. Do not pick these up.

- **A `pages` table.** The JSONB-on-owner pattern already works and is what
  communities do.
- **A users Meilisearch index.** Nobody searches users by keyword yet.
  `ILIKE` is fine at campus scale; revisit if `/people` gets slow.
- **A public/private flag on communities.** Communities are fully public
  today (`CommunityPolicy` grants READ to guests, and there is no visibility
  column). Decision #2 keeps the community list in the template dialog
  unfiltered because of this.
- **An `Appearance` row anywhere.** The app header owns the theme toggle.
- **Modifying `editor.tsx` or `template.ts`.** The Puck remount-on-apply dance
  (`editor.tsx:28-30, 90-107`) is deliberate — Puck does not reload its `data`
  prop after first mount. Do not "clean it up".
- **Editing `web/src/components/ui/item.tsx`.** Per `CONVENTIONS.md`, `ui/` is
  vendor code: consume it, never add project props or hand-written styles to it.
  If `Item` cannot express something, wrap it in `shared/`.

---

## Final self-check

Before declaring done, confirm all of these:

- [ ] `grep -n "^- \[ \]" PROGRESS.md` returns nothing.
- [ ] Every `Item` has a `data-slot` and the `ItemGroup` gap rule still works —
      i.e. rows that are `size="sm"`/`xs` tighten the group. `item.tsx:9-21`.
- [ ] No `theme toggle` / `ThemeToggle` import left under `components/routes/profile/`.
- [ ] `grep -rn "page_content" backend/modules/auth/repository.py` shows the
      upsert loop cannot write it.
- [ ] `GET /api/users` has no query parameter that can widen the visibility
      filter.
- [ ] `media.entity_id` is still `BigInteger` — nothing was widened to `Text`.
- [ ] A private profile returns 404 to a guest, and the page renders to its
      owner.
- [ ] `/u/$slug` and `/people` work with no session.
- [ ] `pnpm api:check` passes — `schema.d.ts` was regenerated and committed with
      its backend change, not left behind.
- [ ] Lint/ruff finding counts did not grow.

---

## Resume protocol

1. `cd backend && uv run ruff check .` and `cd web && pnpm typecheck && pnpm
   lint` — confirm the tree is at least as green as the documented baselines
   (ruff 11, pnpm lint 9).
2. `git diff` + `git status` — see what actually landed.
3. `grep -n "^- \[ \]" PROGRESS.md | head -1` — the first unticked box is where
   you resume.
4. Read the phase header for context, do the item, tick it, run that phase's
   verify command.
5. Check the Alembic head before adding a migration — 0.1 names a revision, and
   someone may have landed another one.

---

## Deviations

### Phase 0

1. **`users.id` is added with `GENERATED BY DEFAULT AS IDENTITY`, not the
   add-nullable / backfill / set-not-null dance.** On PG 10+ the single
   `ALTER TABLE` is sequence-backed, `NOT NULL` and backfills every existing
   row with a distinct `nextval()` value. Verified against the dev PG 17: three
   pre-existing users came back as ids 1, 2, 3. The model declares it as
   `mapped_column(BigInteger, Identity(), nullable=False, unique=True)`, which
   `alembic check` reports as no diff.
2. **The `ALTER TYPE ... ADD VALUE 'users'` is wrapped in an idempotent
   `DO` block checking `pg_enum`.** PG has no `ALTER TYPE ... DROP VALUE`, so
   the value outlives `downgrade()` and a plain re-upgrade fails with
   `DuplicateObject: enum label "users" already exists`. The guard is what makes
   0.5's "applies and downgrades cleanly" true in both directions. The
   downgrade still leaves the value in place, with a comment saying so.
3. **"u" in `RESERVED_SLUGS` cannot actually fire.** `validate_slug` already
   rejects anything under 3 characters, and the mirror-image `validate_slug()`
   plpgsql CHECK constraint the migration `8b32e85c3697` installed does the
   same — so neither the API nor the database will ever accept `u` as a slug.
   Added as specified anyway; it is free and survives a future relaxation of
   the minimum length. The plpgsql copy was left alone deliberately, because
   for this one value the two are already in agreement.

### Phase 1

4. **A body carrying someone else's `sub` is a 422, not a 403.** `PATCH
   /users/me` has no target sub to compare against — the route writes the
   session's own account and nothing else — so a `sub` in the body is
   `extra="forbid"`ed rather than compared. A 403 would have meant adding a
   `sub` field with exactly one legal value, and a comparison that can never
   fail. 422 is also the more honest answer: the plan's 403 assumed the field
   was accepted and then rejected, and silently dropping an unknown field is
   how a caller ends up believing they changed something they did not.
   `UserPagePolicy.check_self` was dropped for the same reason — dead code.
5. **`raise_slug_taken` moved from `communities/api.py` to
   `modules/shared/slug.py`**, next to `validate_slug`, and both routers import
   it. Copying eight lines into `auth/api.py` would have been the only other
   option, and the two 409 paths have to say the same thing.
6. **The media-ownership check is now `shared/media_ownership.py`**, not a
   second copy. `CommunityService._delete_community_media` and
   `UserPageService` were going to need the identical "these ids exist, and
   they belong to *this* entity" check; the community one is 15 lines and its
   403 detail is now generic, since it is no longer community-specific.
7. **`GET /users` items are a `UserSummaryResponse`, not a `UserPageResponse`.**
   A directory of people needs a name, a slug and an avatar, not a rendered
   page's `page_content` and signed GCS media URLs. Two small types beat one
   type that lies about what a list row carries.

### Phase 2

8. **`/me` now carries the surrogate `users.id`.** Media uploads address the
   user by `users.id` — that is what phase 0's column is for and what
   `authorize_user_media_upload` compares — but nothing in the API handed that
   number to the client. `sub` is not an option: `Media.entity_id` is an
   integer column shared with communities and events. So `/me` sends `id`
   alongside `slug`/`is_page_public`/`page_content`/`media`. It is
   session-only and deliberately absent from the public `UserPageResponse`: the
   public page is a shareable artifact and its owner id is nobody else's
   business.
9. **`UserPageResponse.media` declares a plain `= []` default**, matching
   `CommunityResponse`, instead of `Field(default_factory=list)`. Pydantic emits
   a `default` for the former, which is what makes codegen emit
   `media: MediaResponse[]` instead of `media?: MediaResponse[]`. The optional
   form forced `?? 0` at every read site — including `isReady` in the upload
   refresh, where a silent `0` would have meant "the media already landed".

### Phase 3

10. **3.1 and 3.2 landed with phase 2, not after it.** `useUpdateMe`'s
    post-upload refresh has to re-read the page it just wrote — that is the
    whole reason `refreshWhenMediaLands` exists (see the warning in
    `lib/media/functions.ts`) — so `fetchUserPage` and `qk.users.detail` are
    inputs to 2.3, not a follow-up. Splitting them across two commits would
    have meant committing a media upload that silently never refreshes.
11. **`qk.users.mine()` is deferred to phase 7.** The public directory has no
    "owned by me" filter to key it by, and an unused query key is the exact
    kind of speculative surface the rest of this plan is trying to delete. Add
    it with "My Nuspace", which is the first thing that reads it.
