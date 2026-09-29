# PROGRESS — Unify Communities + User Pages into `Pages`

This file is the **single source of truth for this refactor**. It is written to be
handed to an AI agent with a fresh context. Read the whole thing before touching
code, then work the checkboxes in order.

## How to use this file

1. Read this file end to end.
2. Run `git status` and `git log --oneline -10`. Reconcile reality with the
   Progress log below — code wins over the log.
3. Find the **first unchecked box**. That is your next task. Do not skip ahead.
4. Do exactly that task. Do not "while I'm here" anything outside the box.
5. Verify with the gate commands in [Gate](#gate). If the gate is red, fix it
   before ticking the box.
6. Tick the box. Append one line to the [Progress log](#progress-log).
7. Repeat until Phase 6 (prod) is done.

**Phases 3 and 4 are known to leave `pnpm typecheck` red in the middle.** That is
by design and is called out at the top of Phase 4. Do not "fix" it early.

**Never `git commit`, `git push`, or deploy without being asked to.** The user
commits. The agent does the work and reports.

---

## Gate

Must be green at every commit (this is the repo's own rule, from
`web/CONVENTIONS.md` and `CONTRIBUTING.md`).

```sh
# web
cd web
pnpm typecheck      # tsc -b --noEmit
pnpm test           # node --test, no framework
pnpm build          # typecheck + vite build; also regenerates routeTree.gen.ts
pnpm lint           # oxlint --type-aware
pnpm format         # prettier, sorts Tailwind classes
pnpm api:check      # schema.d.ts matches the backend OpenAPI doc

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
- `pnpm api:generate` was last verified against a running backend. If you cannot
  bring one up, **stop and say so** rather than hand-editing
  `web/src/api/schema.d.ts`. It is a generated file.
- CI (`.github/workflows/deploy.yml`) has **no test job**. The gate above is the
  only gate. Run it yourself.

## House rules that are easy to break

- Read `web/CONVENTIONS.md` before writing web code. It is binding.
- Route files are thin: `createFileRoute`, `validateSearch`, `beforeLoad`,
  `loader`, `Route.use*`. Markup lives in `components/routes/<route>/`.
- Page files are `kebab-case`. Puck blocks are `PascalCase` folders.
- `lib/<module>/` has exactly `constants.ts` (limits, enums, zod), `functions.ts`
  (all logic), `types.ts` (types only), `tests.ts`, `index.ts` (barrel).
  Consumers import the barrel, never a file inside it.
- `components/ui/` is shadcn vendor code. Consume it; do not hand-edit it. If a
  primitive does not fit, build the thing in `shared/`.
- Everything under `components/shared/page-editor/` is self-contained. Do not
  split it or import app state into it.
- No `enum` / `namespace` (erasableSyntaxOnly). Use `as const` + derived union.
- `verbatimModuleSyntax`: `import { fn, type T } from "..."`.
- Design tokens only (`bg-muted`, `text-foreground`), never raw palette classes.
- Never build a Tailwind class by interpolation.

---

## Target shape (all decisions are settled — do not re-litigate)

| Decision             | Value                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Public URL           | **`/p/$slug`**                                                                                           |
| Settings             | `/p/$slug/settings`, tabs `general` + `admin-controls`                                                   |
| Editor               | `/p/$slug/editor`                                                                                        |
| Backend modules      | `modules/pages/` and `modules/events/`, both out of `campuscurrent/`                                     |
| `campuscurrent/`     | **deleted entirely**, including the `/test_endpoint` stub                                                |
| Visibility           | `pages.visibility` — `private` \| `internal` \| `public`                                                 |
| Cap: pages           | **100 owned pages per account**                                                                          |
| Cap: images          | **20 content images per page** (`carousel` format)                                                       |
| Account page         | `/account` = Connecting Telegram + My Pages. Nothing else.                                               |
| Account avatar       | Keycloak `user.picture`. Both account `MediaPicker`s deleted.                                            |
| My Pages filter      | shadcn `FilterTabs`: **All / Owned / Admin**                                                             |
| Community → Page     | Business logic copied. `type`, `category`, `email`, `verified` all **dropped**. `description` **added**. |
| Create dialog fields | Name, Description (optional), URL (slug), Logo (optional), Banner (optional)                             |
| Slug                 | autofills from the name until the user edits it                                                          |
| Category popover     | **deleted**                                                                                              |
| Legacy               | No redirects, no alias table, no legacy-slug preservation, no dead reserved words.                       |

Ownership transfer: **the previous owner becomes an admin** (`page_admins` row
inserted, `ON CONFLICT DO NOTHING`) rather than being cut off from the editor.

A future agentic "make me a page" workflow is anticipated but **not built here**.
The only thing this work does for it: `POST /pages` accepts `page_content` and
`owner` is optional (defaults to `"me"`), so one call can produce a finished page.

---

## Phase 0 — Pre-flight

- [x] Bring up the stack and confirm a green baseline: backend up, `pnpm build` passes, backend pytest passes.
- [x] Record the baseline: `git log --oneline -1`, and whether `ruff check` already reports the known ~11 errors.
- [x] Take a **fresh local pg_dump** so you can iterate on the migration without fear:
      `docker compose -f infra/prod.docker-compose.yml exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > /tmp/nuspace-baseline.sql.gz`
- [x] Count the rows you are about to migrate and write them down. They are the thing you will be asked about:
      `sql
SELECT count(*) AS communities, count(DISTINCT owner) AS owners FROM communities;
SELECT count(*) AS community_admins FROM community_admins;
SELECT count(*) AS media FROM media WHERE entity_type = 'communities';
SELECT count(*) AS user_pages FROM users WHERE page_content <> '{}'::jsonb;
SELECT count(*) AS orphan_media FROM media WHERE entity_type = 'users';
`
- [x] Note any community whose name will not slugify cleanly (non-latin names, emoji, punctuation-only). These need the `page-{id}` fallback in the migration.

### Phase 0 findings — read these before Phase 2

`git log --oneline -1` at pre-flight: `db7b225`. The stack was already up
(2 days); nothing needed restarting. `uv run ruff check .` reports **exactly the
known 11** (10 × `E501`, 1 × `F841`) — 4 of them in
`modules/campuscurrent/events/schemas.py`, which Phase 1 moves, so the count
drops to 7 for free. `black --check` clean. Backend pytest **181 passed**. Web
`pnpm build` green, `pnpm test` **82 passed**. Web `pnpm lint` is **red on a
pre-existing baseline of 8 errors** (events, app-sidebar, announcements) plus
one in the untracked `src/components/ui/pagination.tsx`. Baseline captured to
`/tmp/ruff-baseline.txt` and `/tmp/web-lint-baseline.txt`.

Dump: `/tmp/nuspace-baseline.sql.gz`, 12K, gzip-verified. Note the plan's
`docker compose -f infra/prod.docker-compose.yml exec` will not work — the
running containers are from `infra/docker-compose.yml`. `docker exec postgres
pg_dump -U postgres -d postgres | gzip > …` is the equivalent.

Row counts on the local dev DB — **small, so the migration is barely exercised
here and staging is the real test**:

| Query                                   | Count                    |
| --------------------------------------- | ------------------------ |
| `communities`                           | **1** (1 distinct owner) |
| `community_admins`                      | 0                        |
| `community_admin_links`                 | 2                        |
| `media WHERE entity_type='communities'` | **0**                    |
| `users WHERE page_content <> '{}'`      | 3                        |
| `media WHERE entity_type='users'`       | 3                        |
| `users` total                           | 3                        |

The single community is `id=6, name='adsfs', slug='dsfsdfs', owner='mock-sub-bob'`.
All 3 `users`-entity media rows are `profile`/`banner` avatar+banner images that
`b3a4c5d6e7f8` drops on the floor with `users` — expected, and the reason Phase
6c says to check the _page's_ images by eye.

**Two corrections to this plan, both forced by reality:**

1. **The head `e5f6a7b8c9d0` is already taken.** `alembic_version` in the local
   DB is at `e5f6a7b8c9d0`, which is `migrations/versions/e5f6a7b8c9d0_users_category.py`
   (the `users.category` migration, landed in `9a30a0a`). Reusing it is a
   duplicate revision id and Alembic will refuse to start. The three new
   revisions need fresh ids chaining off `e5f6a7b8c9d0`.

2. **The `page-{id}` fallback triggers on _invalid_, not on _empty_.**
   `base_slug` never returns an empty string, so the plan's stated trigger
   ("when a name slugifies to nothing") is unreachable. But `base_slug` is
   _not_ safe to insert directly, because for punctuation-only or emoji input
   it returns a **leading-hyphen** string:
   ```
   base_slug('🎉')  == '-page'      # not ''
   base_slug('!!!') == '-page'
   base_slug('  ')  == '-page'
   base_slug('a')   == 'a-page'
   ```
   `communities` carries `CHECK (validate_slug(slug))`, and `SLUG_RE` is
   `^[a-z0-9]+(-[a-z0-9]+)*$`, so `-page` is rejected. The migration must fall
   back when `validate_slug` raises (or equivalently when the candidate is not
   a valid slug), not when it is falsy. This branch is **live code**, not
   defensive dead weight — do not delete it.

---

## Phase 1 — Dissolve `campuscurrent` (pure move, no behaviour change)

Nothing in this phase changes behaviour or the database. It is a rename plus a
module split, and it must land on its own so the diff is reviewable.

- [x] `modules/shared/base_policy.py` ← `campuscurrent/base.py`. Keep `__init__`, `user_creds`, `user_role`, `user_sub`, `is_admin`, `_is_owner`. **Drop `self.communities` and `_is_community_owner`** (no callers).
- [x] Repoint `modules/opportunities/policy.py:3` to `modules.shared.base_policy`.
- [x] `modules/pages/` ← `campuscurrent/communities/` (still named `Community*` at this point; the entity rename is Phase 2).
- [x] `modules/events/` ← `campuscurrent/events/`.
- [x] Split `campuscurrent/models/`: `models/community.py` → `modules/pages/models/page.py`; `models/events.py` → `modules/events/models/events.py`. Each gets its own `models/__init__.py` barrel (5 and 13 symbols respectively).
- [x] Split `campuscurrent/search_indexes.py` into `modules/pages/search_indexes.py` and `modules/events/search_indexes.py`, each exporting `MEILISEARCH_INDEXES`.
- [x] `lifespan.py:18-20,50` — one import + one spread becomes `PAGES_MEILI_INDEXES` and `EVENTS_MEILI_INDEXES`.
- [x] `core/database/model_registry.py:14` — one import becomes two. **Keep `auth.models` first**: `models/page.py` uses string relationships (`relationship("User")`), so both sides must be imported before any mapper configures.
- [x] `modules/routers.py:8-12` — repoint; delete `test_endpoint_api` and its list entry. Re-sort imports so ruff/isort is happy (`events` sorts before `google_bucket`, `pages` after `opportunities`), then `ruff check --fix`.
- [x] Delete `campuscurrent/profile/` (the 9-line `/test_endpoint` stub). Nothing references it.
- [x] Delete `campuscurrent/` once empty.
- [x] Rewrite the remaining import lines — full list, all 30: - `announcements/dependencies.py:2`, `announcements/interfaces.py:5`, `announcements/schemas.py:1`, `announcements/service.py:9` → `modules.events.*`. Note `announcements/service.py:56` uses `event_schemas.EventStatus.approved` **through a re-export** in `events/schemas.py` — keep that re-export. - `bot/interfaces.py:9`, `bot/repository.py:9`, `bot/routes/user/private/messages/post_event.py:10`, `bot/schemas/event_post.py:9-13`, `bot/services/event_post.py:13-17`, `bot/services/event_publisher.py:11,12,13` → `modules.events.*` - `google_bucket/dependencies.py:11-14` → `modules.pages.*` + `modules.events.*` - `shared/media_ownership.py:11` → `modules.pages.interfaces` - `auth/app_token.py:12`, `auth/profiles.py:17,18`, `auth/service.py:27` → `modules.pages.*`
- [x] Rename `CampusCurrentMediaUploadAuthorizer` → `BucketMediaUploadAuthorizer` in `google_bucket/service.py:12,25,39` and its test.
- [x] Fix the naming-only leftovers: `backend/README.md:21` (drop the Campus Current row), `web/src/lib/media/functions.ts:106`, `web/src/lib/events/functions.ts:383`.
- [x] `rm -rf backend/modules/campuscurrent/**/__pycache__` (15 stale `.pyc` files).
- [x] **Verify:** grep `rg -n campuscurrent backend/ web/src/` returns nothing. Run the full gate. Confirm **no new migration was generated** — this phase must be DB-neutral.

### Phase 1 — what reality added

The plan's import list was 16 files / "all 30" lines. It was **17** files:
`auth/repository.py:8` also imported `campuscurrent.models.community` and was
missing from the list. Repointed the same way.

Splitting the single `models/` barrel into two **broke six files** the plan did
not anticipate, and they only fail at import time, not at build time:

```
modules/events/{schemas,repository,service,policy,utils,attendees_export}.py
  from backend.modules.campuscurrent.models import Event, ...
```

That was the _combined_ barrel, which re-exported both the `Community*` and the
`Event*` symbols. A blind prefix rewrite sends them to
`backend.modules.pages.models`, and the app dies on boot with
`ImportError: cannot import name 'EventAccessPurpose'`. They now import
`backend.modules.events.models`. If you ever split a barrel again, grep for
`from ...models import` and check which side each symbol is on.

`announcements/service.py:56` still reaches `EventStatus.approved` through the
re-export in `events/schemas.py`, as the plan required.

Live check after the move: the container hot-reloaded, `/api/openapi.json` serves
**76 paths**, **10** of them `/communities…` (unchanged), and `test_endpoint` is
gone. The two `/og/communities` routes are `include_in_schema=False`, so they
never appear in that count — check them by hitting them, not by grep.

`git status` renders these moves as swaps (`communities/interfaces.py →
events/interfaces.py` and the reverse) because git's rename detection paired the
two same-shaped files arbitrarily. The file _contents_ at each path are correct
— verified with `git show HEAD:… | diff -`. Trust the paths, not the `R` arrows.

---

## Phase 2 — Backend `pages/` entity (model, migration, policy, limits)

- [x] `modules/pages/constants.py` (new): `MAX_PAGES_PER_OWNER = 100`, `MAX_PAGE_IMAGES = 20`. The `modules/courses/planner/constants.py` file is the precedent for a backend `constants.py`.
- [x] Rename the entity: `Community` → `Page`, `CommunityAdmin` → `PageAdmin`, `CommunityAdminLink` → `PageAdminLink`, across `models/`, `api.py`, `service.py`, `repository.py`, `schemas.py`, `policy.py`, `utils.py`, `dependencies.py`, `og.py`, `search_indexes.py`. Endpoints become `/pages…`.
- [x] `Page` model: **add** `description` (nullable) and `visibility` (`PageVisibility` enum → PG `page_visibility`); **drop** `type`, `category`, `email`, `verified`.
- [x] `PagePolicy._is_owner` reads the FK column, not the relationship: `page.owner == self.user_sub`. The current `community.owner_user.sub` raises `AttributeError` on an ownerless page, and that path runs on every read and update.
- [x] `PagePolicy.check_visible(page, user)`. Not visible ⇒ **404, never 403** (matches the old `UserPagePolicy.check_visible`; do not leak existence).
- [x] `list_admins` moves off `ResourceAction.READ` — which returns `True` for every signed-in user, so today anyone can enumerate any page's admin list — onto the `can_edit` gate.
- [x] Delete `PagePolicy.check_admin_only` and `toggle_verified`. Delete `can_toggle_verified` from `common/schemas.py:28` (only the community util ever set it; events/courses use `can_edit`/`can_delete`/`can_share_access`/`can_view_attendees`).
- [x] `get_page_permissions` (`utils.py`): `editable_fields` becomes `["name","description","slug","page_content","visibility"]`.
- [x] `PageResponse.owner_user` becomes `ShortUserResponse | None`. It is required today and crashes on a NULL owner.
- [x] `reassign_owner`: insert the **previous** owner into `page_admins` with `ON CONFLICT DO NOTHING` before swapping `page.owner`. Keep the existing "the new owner must not also be an admin" delete. This is the one behaviour change the user asked for.
- [x] `create_page`: cap at `MAX_PAGES_PER_OWNER`. `SELECT count(*) FROM pages WHERE owner = :sub`; at the cap return **409** with a clear detail. No site-admin exemption — one rule, no special case.
- [x] `create_page`: make `owner` optional, defaulting to `"me"`. `page_content` is already accepted at create, so an agent can produce a finished page in one call. Do not build anything else for automation.
- [x] `authorize_media_upload(page_id, user, count)`: after the existing `can_edit` check, cap content images at `MAX_PAGE_IMAGES`:
      `sql
SELECT count(*) FROM media
 WHERE entity_type='pages' AND entity_id=:id AND media_format='carousel'
`
      `existing + count > 20` ⇒ **400**, matching the sibling `MAX_UPLOAD_URLS` limit in the same endpoint. Add a `ponytail:` comment naming the ceiling: the count is read before GCS's Pub/Sub hook creates the row, so two concurrent uploads can overshoot by one.
- [x] `google_bucket/interfaces.py`: `MediaUploadAuthorizer.authorize_media_upload` gains `count: int`.
- [x] `google_bucket/api.py:58-64`: replace the `upload_targets` set with a `Counter` of `(entity_type, entity_id)` and pass the per-target count. The authorizer is called once per _target_, not per file, so without this the batch size is invisible to the cap.
- [x] `events/service.py::authorize_media_upload` gains the `count` parameter and ignores it. Events have no cap.
- [x] `list_pages` repository: replace the `type`/`category` conditions with a **hard** visibility `WHERE` — `public` for guests, `public|internal` when signed in, everything when `owner_sub` matches or the caller is a site admin. **Never a caller-supplied parameter.**
- [x] `list_pages` repository: add the `role` filter. `owned` → `pages.owner = :sub`. `admin` → `pages.id IN (SELECT page_id FROM page_admins WHERE user_sub = :sub)`. Replaces `community_type`/`community_category` params.
- [x] `list_media` and `upsert_search`/`delete_from_search`: `EntityType.pages`, `storage_name = "pages"`.
- [x] `communities/og.py`: rename to pages, and **fix the live production bug at line 101.** It calls `get_community_response(infra=…, community_id=id, user=…)` but the signature (`communities/service.py:269`) is `(self, infra, slug: str, user)`. There is no `community_id` parameter, so **both** `/og/communities` routes raise `TypeError` on every single request — every community OG image is broken in prod right now, and has been. The routes take `?id=` but the service only resolves by slug, so the fix needs an id lookup (`select(Page).where(Page.id == id)`, then the same policy check). Do not "fix" it by switching the route to a slug — the frontend and the Telegram preview URL both use `?id=`.
- [x] `infra/nginx/nginx.conf`: **no rule change needed.** The OG proxy at line 209 is `proxy_pass http://fastapi_backend/api/og$request_uri;` — path-agnostic, it passes `/og/pages/` straight through. Only the stale comment at line 178 (`# URLs: /communities/?id=123, …`) needs updating to `/pages/?id=123`. Do not go looking for a `location` block to edit.
- [x] `shared/slug.py`: `RESERVED_SLUGS` gains `p`, **loses** `communities` and `u` (no route can be shadowed any more). `users` stays.
- [x] `RESERVED_SLUGS` docstring: it currently says "the only unique, user-writable column on `Community` and on `User`". Update — it is now only `Page`.
- [x] Delete the `communities` JWT claim: `auth/app_token.py:39-49`, the re-emit at `auth/service.py:399`, the guest principal at `auth/dependencies.py:239`, and the dead `_is_community_owner` in `modules/shared/base_policy.py` (already gone in Phase 1). It was a stale snapshot of owned ids that the FK column makes redundant.
- [x] `auth/profiles.py`: delete `UserPageService`, `UserPagePolicy`, `has_design`, `list_users`, `UserSummaryResponse`, `UserPageResponse`, `UserCommunityResponse`, `_attach_communities`, and the `GET /users` endpoint. Drop `communities` from `/me`.
- [x] `auth/models.py`: `UserRole.community_admin` is a dead enum value — remove it.
- [x] `bot/services/event_publisher.py:78`: the fake principal loses `"communities": []`.
- [x] `media/models.py`: add `EntityType.pages`. The `communities` and `users` values become inert and cannot be dropped (PG enum) — deferred to Phase 7.

### Migration — three revisions, head `e5f6a7b8c9d0`

- [x] `f1e2d3c4b5a6_add_pages.py` - Create the `pagevisibility` enum, then `pages`, `page_admins`, `page_admin_links`. - Copy rows with a **Python loop**, not raw SQL: for each community, `slug = unique(base_slug(name))`, suffixing `-2`, `-3`, … on collision, falling back to `page-{id}` when a name slugifies to nothing. Import `base_slug` and `RESERVED_SLUGS` from `backend.modules.shared.slug` rather than re-implementing the rule. - **Preserve `id`** and both timestamps. `visibility = 'public'` — communities are all effectively public today. - `page_admins` and `page_admin_links` are plain `INSERT … SELECT`; the ids line up.
- [x] `a2f3e4d5c6b7_repoint_media_to_pages.py` - `ALTER TYPE entitytype ADD VALUE IF NOT EXISTS 'pages'`, then
      `UPDATE media SET entity_type='pages' WHERE entity_type='communities'`. - **This must be a separate revision from the one above.** Postgres cannot read a value added by `ADD VALUE` in the same transaction, and Alembic runs a revision in one. Combined into a single file, it fails at runtime — not at build time, not in the diff, in production. Leave a docstring saying so, and do not let anyone merge them back.
- [x] `b3a4c5d6e7f8_drop_communities.py` - Drop `community_admin_links`, `community_admins`, `communities`. - Drop `event_collaborators.community_id`. The `EventCollaborator` model has no service, repository, or endpoint — it is dead, and the FK is the only reason events cannot be extracted cleanly. - Drop from `users`: `page_content`, `is_page_public`, `slug`, `category`, `id`. The last three are only reachable once the people directory and `/u/$slug` are gone; `users.id` existed only so `media.entity_id` could hang an int off `entity_type='users'`.
- [x] `alembic upgrade head` then `alembic downgrade -1` three times, then `upgrade head` again — locally, against the Phase 0 dump. It must round-trip.
- [x] Verify the copy against the Phase 0 counts: `SELECT count(*) FROM pages` equals the old `communities` count; every page has a non-null, unique, reserved-word-free slug; every old media row now has `entity_type='pages'`.
- [x] Verify no page image was orphaned:
      `sql
SELECT p.id FROM pages p
LEFT JOIN media m ON m.entity_id = p.id AND m.entity_type='pages'
WHERE m.id IS NULL;
`
      A non-empty result is a bug in the copy, not a page that legitimately has no images. Cross-check against the pre-migration count.

### Backend tests

- [x] `test_community_url_validation.py` (66 cases) → `tests/test_page_url_validation.py`, renamed. Delete the telegram/instagram cases — `email` is gone.
- [x] `test_list_admins_pagination.py` → page repo mocks.
- [x] **New `tests/test_page_visibility.py`** — guest / signed-in / owner / admin / site-admin across all three visibility values, plus the 404-not-403 rule. This is the one genuinely new rule and it does not ship untested.
- [x] **New `tests/test_reassign_owner.py`** — the old owner ends up in `page_admins`, the new owner's admin row is gone, both idempotent, and a transfer to yourself is a no-op.
- [x] **New `tests/test_page_limits.py`** — the 100-page cap and the 20-image cap, including the `existing + count` boundary (19 existing + 1 = ok, 19 existing + 2 = 400).
- [x] Fix `auth/tests/test_user_profiles.py` (asserts community positions, `has_design`) and `google_bucket/tests/test_media_upload_authorization.py` (constructs the renamed authorizer).
- [x] **Verify:** full backend pytest green. `pnpm api:generate` — regenerate `web/src/api/schema.d.ts` — **deferred to Phase 3**, which schedules it and sanctions a red typecheck; regenerating here turns the gate red for the whole of Phase 2. See the Phase 2 note.

### Phase 2 — what reality added

Four things the plan did not anticipate. All four are corrections to the
plan, not open questions.

1. **The `ADD VALUE` split is not enough — it needs
   `transaction_per_migration=True`.** Splitting the enum value into its own
   revision, as the plan says, is necessary but not sufficient: with Alembic's
   default single-transaction-per-`upgrade head`, all three revisions commit
   together and `a2`'s `UPDATE media SET entity_type='pages'` still cannot read
   the value `f1` added. `backend/migrations/env.py` now sets
   `transaction_per_migration=True` in both the online and offline branches. A
   future migration that depends on its own `ADD VALUE` is silently wrong
   without this.

2. **The live dev DB migrated itself.** `backend/bootstrap/db.py` runs
   `alembic upgrade head` at startup, and the `fastapi` container bind-mounts
   the backend with a file watcher — so editing a migration re-triggers the
   upgrade. The dev DB went to `b3a4c5d6e7f8` on its own, which is also why the
   3 orphan `users` media rows were still present at the end: `b3`'s
   `DELETE FROM media WHERE entity_type='users'` was added _after_ that run.
   Applied manually to match a fresh upgrade; `media` is now empty and
   `/pages/adsfs` serves 200. **Do the destructive round-trip on a scratch DB
   (as done here), and treat a running `fastapi` container as a live migration
   trigger.**

3. **`alembic check` is not a usable gate in this repo.** It reports drift for
   `event_access_invites`, `sg_ministries`, `ticket_telegram_messages` and
   others that predate this work, so a red `check` proves nothing on its own.
   It is still worth reading for _new_ tables. It caught two real omissions in
   the tables this phase added: `pages` carried `chk_pages_slug` and a
   `visibility` server default in the DB but not in the model, and
   `page_admin_links` carried the `uq_page_admin_links_active` partial unique
   index in the DB but not the model. Without declaring them, the next
   autogenerate reads them as drift and drops the slug check. Both are now in
   `models/page.py`, and `alembic check` is clean for every page table. The
   residual `page_admin_links` items are the pre-existing
   `unique=True, index=True` pattern inherited unchanged from
   `CommunityAdminLink`.

4. **A policy bug the policy tests could not see.** `get_page_response` and
   `get_page_response_by_id` built `PagePolicy` without `is_page_admin`, so a
   page admin could see their own private page in `list_pages` — which resolves
   the flag — and then get a **404** the moment they opened it. The
   `test_page_visibility.py` matrix is handed `is_page_admin` directly and so
   cannot catch a caller that never looks it up; the three service-level tests
   added at the bottom of that file can. Both read paths now go through
   `_load_page_and_policy`, and `_get_page_or_404` is gone — it was the only
   caller of a path that skipped the lookup.

`schema.d.ts` was regenerated once to confirm the backend side is correct
(248 insertions / 680 deletions, `api:check` green against the exported
doc), then **reverted** — see item 1 of the open decision below.

**Decisions taken, for the record:**

- `pnpm api:generate` is **not** run in this phase. The regenerated schema is
  correct, but the web still imports `UserPageResponse`, `UserSummaryResponse`,
  `UserCommunityResponse`, `UserPageUpdateRequest` and the `communities`
  entity type, so committing it turns `pnpm typecheck`/`pnpm build` red for the
  whole of Phase 2. Phase 3 already schedules the regeneration (line 333) and
  explicitly sanctions a red typecheck at its end (line 320), so the file lands
  there, once, with the web that actually uses it. The Gate says green at every
  commit and that wins.
- The `chk_pages_slug` and `uq_page_admin_links_active` declarations were
  **added to the model** rather than removed from the migration: both are
  correctness constraints (a malformed slug, two live invite links for one
  page), and the repo has no `CheckConstraint`/`server_default` precedent, but
  the alternative was silently dropping them on the next autogenerate.

### Gate at the end of Phase 2

Backend **195 passed** (was 181), black ✓, ruff **11** — unchanged findings,
all in untouched files, and down from a 15-error stash baseline. Web: 82 tests
✓, `pnpm build` ✓, `pnpm lint` **9** = the captured baseline exactly.
`alembic upgrade → downgrade ×3 → upgrade` round-trips on a scratch DB
restored from `/tmp/nuspace-baseline.sql.gz`.

---

## Phase 3 — Web plumbing

`pnpm typecheck` **will be red** at the end of this phase. Routes still reference
the old keys. That is expected; Phase 4 fixes it. Do not paper over it.

- [x] `lib/communities/` → `lib/pages/` (5 files). Delete `COMMUNITY_TYPES`, `COMMUNITY_CATEGORIES`, `COMMUNITY_CREATE_ONLY`, the telegram/instagram URL validators (`email` is gone), `isCommunityAdmin`. Keep `adminRowActions` → `adminPageActions`, `canEditField`, the `saveWithMedia` wiring, and the filter type (now `keyword`/`owner_sub`/`role`).
- [x] `lib/pages/constants.ts`: add `MAX_PAGES_PER_OWNER = 100`.
- [x] `lib/media/constants.ts`: add `MAX_PAGE_IMAGES = 20`.
- [x] `components/shared/page-editor/blocks/_shared/index.tsx:92` — delete the local `MAX_PAGE_IMAGES` and import it from `@/lib/pages`. There must be one copy in the web app.
- [x] `lib/user/`: delete `fetchUsersPage`, `fetchUserPage`, `userPageQueryOptions`, `UserSummary`, `UserCategory`, `toUserUploadItems`. Strip `media`, `slug`, `communities`, `category`, `is_page_public` and `page_content` from the hand-written `/me` zod parse in `constants.ts`.
- [x] `lib/user/functions.ts`: add a pure `slugFromName(name)` mirroring the backend's `base_slug`, plus cases in `lib/user/tests.ts`. This drives the create-form autofill.
- [x] `lib/slug.ts`: add `p`; remove `communities` and `u`. Update the docstring — it says the handle is "the only unique, user-writable column on both communities and users", which is no longer true of users.
- [x] `lib/media/{types,functions}.ts`: entityType union → `"pages"`. Keep `community_events` (that is events' misnomer and is out of scope). Update the `campuscurrent/events/…` path in the `selectMedia` docstring.
- [x] `hooks/use-session.ts`: delete the dead `canManageCommunity` and the `communities` array it consumed.
- [x] `api/query-keys.ts`: `qk.communities` → `qk.pages`, with a `mine(role, page)` key that includes both the role and the page. Delete `qk.users.list`.
- [x] `pnpm api:generate`, commit the regenerated `web/src/api/schema.d.ts`.

### Phase 3 — what reality added

Three things the plan did not anticipate, all consequences of deleting the
user-page feature rather than separate decisions.

1. **The `/me` zod parse had more to lose than the plan listed.** The plan
   enumerates `media`, `slug`, `communities`, `category`, `is_page_public` and
   `page_content`. Stripping them takes `id` with them — it was the surrogate
   `users.id` that media uploads were addressed by, and `b3` drops the column —
   and it takes the whole hand-written `mediaSchema` and its `ENTITY_TYPES` /
   `MEDIA_FORMATS` mirrors with it, since `media` was the only field using
   them. `USER_CATEGORIES` and `userCategorySchema` go too: nothing in the
   parse referenced them, and their only consumers were the `u/` and
   `mynuspace` files Phase 4 deletes. What is left of `constants.ts` is 12
   lines of identity fields.

2. **`lib/user/functions.ts` lost more than the plan listed, in the same way.**
   `toUserUploadItems` and `fetchUsersPage` are named, but
   `fetchUserPage`, `userPageQueryOptions` and the private
   `refreshWhenMediaLands` are all reachable only from them, and `useUpdateMe`
   is dead with them — it PATCHes `/users/me`, an endpoint this branch
   deleted. That took `useMutation`, `useQueryClient`, `useMediaUpload` and
   the whole `lib/media` import with it. The file is 135 lines now and holds
   only session and login transitions.

3. **`MAX_PAGE_IMAGES` had to go to `@/lib/media`, not `@/lib/pages`.** The
   plan says import it from `@/lib/pages`, but the editor block that needs it
   (`page-editor/blocks/_shared/index.tsx`) already imports from `@/lib/media`
   for `validateImage` and `ACCEPTED_IMAGE_TYPES`, and the file's own
   constant sat next to those. The constant therefore went into
   `lib/media/constants.ts` alongside `MAX_UPLOAD_BATCH` and
   `MAX_IMAGE_BYTES` — one copy in the app, as required, and in the module
   the consumer was already reading from. `MAX_PAGES_PER_OWNER` went to
   `lib/pages/constants.ts` as planned, since only pages code needs it.

4. **`COMMUNITY_CREATE_ONLY` was deleted, not renamed.** The plan lists it
   among the things to drop and I had kept it as `PAGE_CREATE_ONLY`, which was
   the wrong call: `git grep COMMUNITY_CREATE_ONLY` at `HEAD` finds only the
   definition and the plan line itself, so it was already dead before this
   phase. `git grep` for the rename then confirmed nothing picked it up in the
   interim. `lib/pages/constants.ts` is one constant now. Anything that needs
   it back can write the three lines.

**`slugFromName` was verified against the backend, not reasoned about.** All
18 cases were run through the real `base_slug` in the container and compared
to the TypeScript. Two quirks had to be reproduced exactly, and both are
asserted in `lib/user/tests.ts`:

- a name that slugifies to nothing yields `"-page"` — the empty result plus
  `"-page"` still starts with a hyphen and the backend does **not** strip it.
  The Phase 0 note already recorded this on the migration; a "fixed" JS
  version would disagree with both;
- the 50-character cut happens **before** the length floor, so a long name is
  truncated mid-word (`…fifty-characte`) rather than padded.

`RESERVED_SLUGS` was compared the same way: 19 slugs, set-equal with the
backend's.

### Gate at the end of Phase 3

`pnpm test` **83 passed** (was 82; the eleven `slugFromName` cases in, the
~60 URL-validation cases out). `pnpm format` ✓.

`pnpm typecheck` is **red with 120 errors**, as the phase header predicted.
**Zero** of them are in `src/lib/`, `src/api/` or `src/hooks/` — the surface
this phase owns. All 120 are in `routes/communities/**`, `routes/u/**`,
`mynuspace`, `page-editor` and `app-sidebar`, every one of which Phase 4
deletes or rewrites. `pnpm lint` is red for the same reason and the same
reason only: the 9-error pre-existing baseline is intact and unchanged, with
the 120 type-aware errors layered on the same Phase 4 files. Phase 4 is what
turns both green.

---

## Phase 4 — Web routes and components

- [x] Delete `src/routes/_app/communities/**` and `src/routes/_app/u/**` (8 files).
- [x] Add `src/routes/_app/p/$slug/index.tsx` — loader `ensureQueryData(pageDetailQueryOptions)`, 404 → `notFound()`, reads the optional `?admin=` token, custom `NotFound`. No width clamp on the body (the page _is_ the design).
- [x] Add `src/routes/_app/p/$slug/editor/index.tsx`.
- [x] **Add the missing auth guard to the editor route.** Today `/communities/$slug/editor` checks 404 only; the only thing protecting it is `PATCH` rejecting the write. It must check `can_edit`, matching the settings guard.
- [x] Add `src/routes/_app/p/$slug/settings/{route,index,general,admin-controls}` — the two-tab layout (`General`, `Admin controls`) is unchanged from communities.
- [x] Add `src/routes/_app/account/index.tsx`:
      `ts
validateSearch: z.object({
page: z.coerce.number().int().min(1).default(1),
role: z.enum(["owned", "admin"]).optional(),
})
`
      Read with `Route.useSearch()`. Change pages with
      `useNavigate({ from: Route.fullPath, search: prev => ({ ...prev, page: n }) })`
      — the **functional updater** form. `search: { page: n }` would clobber the `role` filter.
- [x] `src/routes/_app/mynuspace/index.tsx`: search loses `category`; it becomes the pages browser. Keeps `useInfiniteList` + `CardGrid` — a browse grid is not a table.
- [x] `components/routes/communities/` → `components/routes/pages/` (`index.tsx` detail, `editor/`, `settings/{general,admin-controls,components/{admins-table,admin-access-link}}`).
- [x] `settings/general`: Details (name, description, slug, logo, banner) + a **Visibility** radio group + Danger zone. Delete the Info popover.
- [x] `settings/admin-controls`: admin link + admins table + the **transfer ownership** control. `useTransferCommunityOwner` lives in `lib/communities/functions.ts` and is already called from `components/routes/communities/settings/components/admins-table.tsx` — so the UI exists, it just moves with the file. Re-point the import; do not rebuild it.
- [x] `mynuspace`: render `PageCard` (from `community-card.tsx`, type/category badge removed). Delete `components/routes/mynuspace/components/user-card.tsx` — it was already a deliberate copy of `CommunityCard`.
- [x] `src/index.css`: the `--community` token becomes a page token. Update the three usages.
- [x] New `components/shared/pages/page-form.tsx` + `page-form-dialog.tsx` (from `community-form{,-dialog}.tsx`). Shared, not route-local, because `/mynuspace` and `/account`'s empty state both reach it. Fields: name, description (optional), slug, logo (optional), banner (optional).
- [x] **Slug autofill from the name.** One `useState` + a "user has touched the slug" flag. ~5 lines. Do not over-engineer it.
- [x] New `components/routes/account/index.tsx` = **Connecting Telegram** + **My Pages**. Nothing else. No identity row, no `MediaPicker`s, no avatar. Move `telegram-link.tsx` in from `u/$slug/settings/`.
- [x] New `components/routes/account/components/my-pages.tsx` — `PAGE_SIZE = 10`, `?page=` in the URL, `keepPreviousData`, and a `FilterTabs` row (the project's shadcn-`ui/tabs` filter strip) over **All / Owned / Admin**, mapping to `GET /pages?role=`. Row badge reads **Owner** or **Admin** rather than the old hardcoded `Owner`.
- [x] `components/shared/page-editor/components/template-dialog.tsx`: collapse to **one** source. One `useInfiniteList(qk.pages.list({ keyword }))`, one handler. The people/communities tabs go, and the extra `fetchUserPage` round-trip disappears — `ListPage` items already carry `page_content`.
- [x] `components/shared/page-editor/context.tsx`: `UploadContextData` narrows to `entityType: "pages"`.
- [x] `components/layouts/app/app-sidebar.tsx`: remove the `Communities` nav item (`My Nuspace` is the only pages entry). Account card links to `/account` — no `params` any more.
- [x] `components/layouts/app/index.tsx`: the app-shell bypass becomes `/p/$slug` and `/p/$slug/editor`.
- [x] `components/routes/landing/index.tsx:65`: the marketing link to `/communities` now points at `/mynuspace`.
- [x] **Verify:** `pnpm typecheck` is green again. `pnpm build` regenerates `routeTree.gen.ts` — commit it. `rg -n "communit" web/src/` returns only legitimate leftovers you can justify in the commit message.

### Pagination

- [x] New `components/shared/table/page-numbers.ts` — `pageNumbers(current, total, window = 1) → (number | "…")[]`. First and last always present, ellipsis inserted, current clamped into range. This is the fiddly part, so it is the part that gets pinned.
- [x] New `components/shared/table/page-numbers.test.ts` covering: single page, two pages, exact-fit window, both ellipses, current on the first and last page, current out of range.
- [x] Rewrite `components/shared/table/pagination.tsx` on the **`ui/pagination` primitives** — `Pagination` › `PaginationContent` › `PaginationItem` › `PaginationLink` / `PaginationEllipsis`, with `PaginationPrevious`/`PaginationNext` and the existing `pageRangeSummary` range text. Numbered pages, not chevron-only. Do not add project-specific props to `ui/pagination.tsx` itself.
- [x] Point both paginated tables at it: My Pages and the page admins table. `page-range.ts` stays.
- [x] **Verify:** `pnpm test` green. `pnpm typecheck && pnpm test && pnpm build && pnpm lint && pnpm format` all green.

### Phase 4 — what reality added

**The editor guard is the security fix here.** `/p/$slug/editor` used to check
404 only, on the reasoning that `PATCH` rejects an unauthorised write anyway.
That left the route open to anyone who could spell a slug: they could open the
editor and build a draft they had no right to design. It now checks
`can_edit`, matching the settings guard, and the server still refuses the write
behind it.

**Four things the plan did not anticipate:**

1. **`/mynuspace` absorbed the communities list, and `pages/index.tsx` went
   with it.** The plan asked for both `components/routes/pages/index.tsx` and a
   pages browser at `/mynuspace`, which is one component written twice. The
   browser is `mynuspace`'s now; `pages/` keeps only `$slug/`, `editor/`,
   `settings/` and the card.

2. **The page form could not stay a straight rename.** `type`, `category` and
   `email` went with their columns, which took `FieldSelect` and two thirds of
   the form with them. What is left is five fields and one `useState` for the
   slug flag. The create body also has to send `visibility` and `owner`
   explicitly: the backend defaults both, but the generated type marks them
   required, and an unsafe assertion to dodge that is worse than saying
   `visibility: "public", owner: "me"` out loud.

3. **The detail header lost its Info popover and its mail button**, not by
   choice but because `PageResponse` has no `category`, `type`, `verified` or
   `email` to put in them. The card is the same story: the two badges became one
   visibility badge, since that is the only fact about a page that is still
   both shown to the reader and true.

4. **`TablePagination` needs the current URL, not a path prop.** The numbered
   links are real anchors so middle-click works, and My Pages has to keep
   `role=admin` when it pages. So the href is built from `location.href` with
   `page` replaced, which makes the component correct for both call sites
   without knowing either one's other search params.

`pageNumbers` is exported and tested on its own, including a loop over all 465
(current, total) pairs up to 30 asserting first-and-last present, ascending,
and in range. The bug it exists to catch is a 2-page table rendering
`1 2 2`, which is why `pageNumbers(2, 2)` is asserted twice.

### Gate at the end of Phase 4

`pnpm typecheck` ✓, `pnpm test` **95 passed**, `pnpm build` ✓ (with
`routeTree.gen.ts` regenerated and committed), `pnpm api:check` ✓,
`pnpm lint` **9 errors — the pre-existing baseline, unchanged**, `pnpm format` ✓.

`rg -in communit web/src/` returns four hits and all four are justified: the
ToS copy ("the Nazarbayev University community"), the slug comment explaining
why `"communities"` was removed from `RESERVED_SLUGS`, the landing comment
noting `/communities` is gone, and the template dialog explaining that its tabs
used to be People and Communities. No code path, route, query key or CSS token
is left on the old name.

---

## Phase 5 — Docs

- [ ] `web/CONVENTIONS.md`: route table rows (`/communities` → `/p/$slug…`), the `wide`/`prose` assignment, the two app-shell bypasses, the `lib/communities/tests.ts` example → `lib/pages/tests.ts`.
- [ ] `web/CONVENTIONS.md`: add the new `shared/pages/` group to the `components/shared/` list.
- [ ] `web/README.md:175` — it already points at `features/communities/url-validation.ts`, which stopped existing a while ago. Fix it.
- [ ] `web/README.md:142` — the media-format note says `communities → profile + banner`. Update to `pages`.
- [ ] `backend/README.md` — the Campus Current row is gone from Phase 1. Check the module table for anything else now stale.
- [ ] Delete this file, or move it to `web/PROGRESS.done.md`, once Phase 6 is done.

---

## Phase 6 — Push to prod

**This is a hard cutover, not an expand/contract migration.** The `communities`
table, the `/communities` routes, `/u/:slug` and the people directory all stop
existing in the same deploy. There is no zero-downtime path, because the media
rows have to _move_ rather than be copied — `media.name` is the GCS object path
and is unique, so a page's images cannot exist under two `entity_type` values at
once. Plan a maintenance window. Do not pretend otherwise in the release notes.

### 6a. Before you merge to `main`

- [ ] **Staging first.** Merge to `dev`, wait for the pipeline, and exercise the whole flow on staging: create a page, edit it in the Puck editor, upload a logo and a banner, set each visibility level and check it as guest / signed-in / owner / admin, transfer ownership and confirm you keep editing, list admins, redeem an admin link, hit the 100-page cap, hit the 20-image cap, search a page by keyword.
- [ ] Confirm on staging that no `communities` index lingers in Meilisearch. `bootstrap/meilisearch.py:46-52` deletes **every** existing index and re-syncs from the DB on boot, so the new `pages` index is built fresh and the old one is dropped. Search is briefly empty while that runs — it self-heals, do not chase it.
- [ ] **Take a fresh verified backup on prod.** This is the only rollback that exists.
      `sh
docker exec backup /bin/bash /scripts/pg-dump-backup.sh
docker exec backup /bin/bash /scripts/walg-backup-push.sh
docker logs backup --tail 50          # expect "pg_dump backup uploaded to gs://..."
gcloud storage ls gs://nuspace-backups-prod/pg-dump/postgres/<DB_NAME>/
`
      Do not proceed until you see a **new** object with a current timestamp.
- [ ] Confirm you know how to restore it. The procedure is in `infra/backup/README.md` (Вариант A — pg_dump). Read it now, not during the incident. **Test the restore on staging first.**
- [ ] Note the media reality: GCS media is **not** in the pg_dump. If you must roll back, the `Media` rows come back from the dump but the image files were never at risk — they live in the `nuspace-media` bucket. Orphaned rows are recoverable; orphaned files are not the risk here.

### 6b. Deploy

- [ ] Pick a window. The site is usable except for pages and communities, which are **deliberately gone** after this deploy.
- [ ] Merge to `main`. The pipeline builds the FastAPI image, builds the web static export on the runner, and runs Ansible. Order inside `ansible/playbook.yml` is: **backend (migrations → fastapi restart) → frontend (unpack `out/` → reload nginx) → infra services.**
- [ ] **Know the window you are accepting.** `ansible/roles/backend/tasks/main.yml` runs `alembic upgrade head` (line 82) _before_ `up --no-deps -d fastapi` (line 91). Between those two steps the **old code is running against the new schema**, so `/communities` 500s and the old `/me` shape is gone. The window is the migration duration plus container start. There is no way to shrink it without shipping compatibility shims, which are out of scope.
- [ ] Expect 404s from **cached old frontend bundles** after the deploy — browsers holding the previous `web/out` still call `/communities` and `/u/:slug`. They resolve on next reload. Do not add a redirect shim to paper over this; it is the intended behaviour.

### 6c. After the deploy

- [ ] `docker logs fastapi --tail 200` — no tracebacks, no `ProgrammingError` on a missing `communities` table.
- [ ] `docker logs postgres 2>&1 | grep -i archive` — WAL archiving still healthy, so your PITR chain did not break.
- [ ] `curl -s localhost/api/openapi.json | jq '.paths | keys' | grep -c pages` — the routes are live.
- [ ] Logged out: a `public` page renders at `/p/<slug>`; an `internal` page 404s; a `private` page 404s.
- [ ] Logged in: an `internal` page renders; a `private` page you do not own 404s; your own `private` page renders.
- [ ] My Nuspace lists pages. `/account` shows Telegram + My Pages, and the My Pages filter switches Owned/Admin.
- [ ] Create a page end to end: the dialog, the slug autofill, the editor, publish, and the image shows up after the Pub/Sub round trip.
- [ ] Keyword search returns a page by name (Meilisearch re-indexed).
- [ ] A community's old logo and banner are still on its migrated page. This is the single most likely thing to be silently wrong — the media rows moved by `entity_type` and nothing else. Check it by eye.
- [ ] `/og/pages/?id=<id>` returns OG HTML. **It does not work today** — the old route 500s on every hit with a `TypeError`, so any working response here is new behaviour and proves the fix landed.
- [ ] Confirm `alembic_version` on prod is at the head of the chain.

### 6d. Rollback, if you need it

- [ ] **`git revert` is not a rollback.** By the time the pipeline finishes, revision 3 has dropped `communities` and the data is gone. Reverting the code puts the old app in front of a schema it cannot read, and it will not start.
- [ ] The real rollback is a database restore, per `infra/backup/README.md` (Вариант A): stop `fastapi`, recreate the database from the dump taken in 6a, start `fastapi`. Budget real time for it — this is a full `DROP DATABASE` + `pg_restore`.
- [ ] If you need the _schema_ back but not the data, WAL-G PITR (Вариант B) can stop at a `recovery_target_time` just before the migration. Use a recovery VM, not prod.
- [ ] Tell the user immediately. Do not start a restore on prod without saying so first.

---

## Phase 7 — Deferred cleanup (not this PR)

Explicitly out of scope. The user will handle these after the prod push.

- [ ] Drop the now-inert PG enum values, which cannot be dropped in place: `community_category`, `community_type`, `collaborator_type.community`, `usercategory`, and the `communities` / `users` values in `entitytype`. This needs a type-recreation migration.
- [ ] Decide whether `modules/courses`' two independent `BasePolicy` copies collapse into `modules/shared/base_policy.py`. They were left alone deliberately.
- [ ] `MediaAttachmentResolver` lives in `modules/pages/interfaces.py` but is really a media port, and `shared/media_ownership.py` importing from `pages` is the kind of cycle that grows. `modules/media/interfaces.py` is the honest home.
- [ ] `events` has a `MediaAttachmentResolver` copy identical to the one in `pages`. Collapse to one.
- [ ] The `BotSubmission` / event-suggestion flow is untouched but adjacent. Not this PR.

---

## Progress log

Append one line per ticked box. Newest at the bottom.

| Date       | Phase | What                     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ----- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —          | —     | Plan written             | `web/PROGRESS.md` created. No code changed yet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-29 | 0     | Pre-flight               | Stack already up. `pnpm build` ✓, 82 web tests, 181 backend tests, `black` ✓. Baselines: ruff **11** (as documented), web lint **8** pre-existing. Dump → `/tmp/nuspace-baseline.sql.gz`. Counts: 1 community, 0 community_admins, 2 admin links, 0 community media, 3 user pages, 3 orphan `users` media. Two plan corrections recorded above: the head id `e5f6a7b8c9d0` is already taken by `users_category`, and the `page-{id}` fallback keys on an _invalid_ slug (`base_slug('🎉') == '-page'`), not an empty one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-29 | 1     | Dissolve `campuscurrent` | `campuscurrent/` gone. `base.py` → `shared/base_policy.py` (dropped `communities` + `_is_community_owner`, no callers), `communities/` → `pages/`, `events/` → `events/`, models split 5/13, search indexes split, `CAMPUSCURRENT_MEILI_INDEXES` → `PAGES_`+`EVENTS_`, `test_endpoint` dropped, `CampusCurrentMediaUploadAuthorizer` → `BucketMediaUploadAuthorizer`. DB-neutral: single head still `e5f6a7b8c9d0`, `alembic_version` unchanged, no migration written. Gate green — ruff 11 (same findings, 4 just moved to `modules/events/`), black ✓, 181 backend tests, 82 web tests, typecheck/build/format ✓, web lint 8 = baseline. Live: 76 OpenAPI paths, 10 still `/communities…`. Six `events/*.py` files needed the _events_ barrel, not the pages one — see the Phase 1 note. Plan's import list was 16 files; it was 17 (`auth/repository.py:8` missing).                                                                                                                                                                                                                                                      |
| 2026-09-29 | 2     | Backend `pages/` entity  | `Community` → `Page` across model/api/service/repository/schemas/policy/utils/og/search_indexes; `type`/`category`/`email`/`verified` dropped, `description`+`visibility` added; hidden pages 404; `list_admins` off `READ` onto the `can_edit` gate; user-page service, `GET /users`, `/u/$slug`, the `communities` claim and `UserRole.community_admin` all deleted; 100-page and 20-image caps; `EventCollaborator.community_id` dropped. Three migrations `f1e2d3c4b5a6` → `a2f3e4d5c6b7` → `b3a4c5d6e7f8`, head now `b3a4c5d6e7f8`; round-trip ✓ against the Phase 0 dump on a scratch DB. Four reality corrections recorded above: `transaction_per_migration=True` is required on top of the enum split; the dev DB self-migrates via `bootstrap/db.py`; `alembic check` needs two declarations added to `models/page.py`; and a private-page admin got a 404 on detail because both read paths skipped `is_page_admin`. Gate green — 195 backend tests (was 181), black ✓, ruff 11 = baseline, 82 web tests, build ✓, web lint 9 = baseline. `schema.d.ts` regeneration deferred to Phase 3 so the gate stays green. |

## Open questions

None blocking. If something surfaces that contradicts the decisions table, **stop
and ask the user** rather than choosing. Specifically:

- If the migration turns out to need slug collision handling beyond `-2`, `-3`, …
- If `pg_restore` on staging does not complete in a sane time, the 6d rollback
  plan needs revisiting before you merge to `main`.
- If it turns out to be materially cheaper to keep the old endpoints around for
  one release to avoid the maintenance window, that is a conversation to have,
  not a decision to make unilaterally.
