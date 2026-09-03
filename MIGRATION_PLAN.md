# Migration Plan: Community/User Schema Refactor

> **Purpose:** This file is a self-contained prompt for an AI agent (or human) to execute
> a multi-phase schema migration on the `nuspace` repo (`dev` branch). Each phase has
> checkboxes. Mark them `[x]` as you complete work. If you lose context, re-read this
> file — it contains every reference you need.

## Repository context

- **Backend:** Python 3.12 / FastAPI / SQLAlchemy ORM / Alembic migrations in `backend/migrations/versions/`
- **Frontend:** `/web` is the **only** active frontend (React + TypeScript, TanStack Router/Query). `/frontend` is dead legacy — **never read, edit, or reference it.**
- **DB:** PostgreSQL. Migrations run via `docker compose run --rm migrate` (which runs `alembic upgrade head`). Ansible triggers this automatically on deploy.
- **Branch:** `dev`

---

## What this migration does

### Communities table

| Operation | Column | Details |
|-----------|--------|---------|
| Rename | `head` → `owner` | FK stays `ForeignKey("users.sub", ondelete="SET NULL")`. Relationship `head_user` → `owner_user`. |
| Drop | `description` | |
| Drop | `established` | |
| Drop | `telegram_url` | |
| Drop | `instagram_url` | |
| Add | `slug` | `TEXT NOT NULL UNIQUE`, validated by PG function, backfilled from `name` |
| Add | `page_content` | `JSONB NOT NULL DEFAULT '{}'::jsonb` |
| Confirm | `verified` | Already exists as `BOOLEAN NOT NULL DEFAULT FALSE` with index — do not re-add |

### Users table

| Operation | Column | Details |
|-----------|--------|---------|
| Add | `slug` | `TEXT NOT NULL UNIQUE`, validated by PG function, backfilled from `name || ' ' || surname` |
| Add | `page_content` | `JSONB NOT NULL DEFAULT '{}'::jsonb` |
| Add | `is_page_public` | `BOOLEAN NOT NULL DEFAULT false` |

### Shared: slug validation (PG function + CHECK constraint)

- Lowercase alphanumeric + hyphens only
- No leading, trailing, or consecutive hyphens: regex `^[a-z0-9]+(-[a-z0-9]+)*$`
- Length 3–50 chars
- Reserved-word blocklist (checked at DB level AND Python level): `edit`, `admin`, `new`, `create`, `api`, `settings`, `about`, `terms-of-service`, `privacy-policy`, `communities`, `users`, `events`, `courses`, `announcements`, `contacts`, `opportunities`, `profile`, `sgotinish`
- Enforcement: PG CHECK constraint on both tables + Python Pydantic validator (source of truth for user-friendly errors)

---

## Phase 1: Alembic Migration

- [x] **1.1** Create migration file: `backend/migrations/versions/<rev>_community_user_schema_refactor.py`
  - Use `alembic revision -m "community_user_schema_refactor"` from `backend/` to generate it
  - The latest revision head is in `backend/migrations/versions/` — read the newest file to find its `revision` hash, set as `down_revision`

- [x] **1.2** Write `upgrade()` with this exact order:

  ```
  1.  CREATE OR REPLACE FUNCTION validate_slug(slug TEXT) → BOOLEAN
      - regex: ^[a-z0-9]+(-[a-z0-9]+)*$
      - length check: 3–50
      - reserved words check (full blocklist above)
      - return true/false

  2.  CREATE OR REPLACE FUNCTION generate_unique_slug(input_text TEXT, target_table TEXT) → TEXT
      - convert: lowercase, non-alphanumeric → hyphens, strip leading/trailing
      - truncate to 50 chars, remove trailing hyphen after truncate
      - if < 3 chars: append '-page'
      - collision loop: check target_table only + reserved words, append '-2', '-3'...

  3.  communities: ALTER COLUMN head RENAME TO owner
      (op.alter_column("communities", "head", new_column_name="owner"))

  4.  communities: drop index ix_communities_head, then rename FK constraint
      (op.drop_index(..., table_name="communities"))
      (op.drop_constraint("communities_head_fkey", "communities", type_="foreignkey"))
      (op.create_foreign_key("communities_owner_fkey", "communities", "users", ["owner"], ["sub"], ondelete="SET NULL"))

  5.  communities: drop columns in order: description, established (drop ix_communities_established first), telegram_url, instagram_url

  6.  communities: ADD COLUMN slug TEXT NULL
      communities: UPDATE SET slug = generate_unique_slug(name, 'communities')
      communities: ALTER COLUMN slug SET NOT NULL
      communities: ADD CONSTRAINT uq_communities_slug UNIQUE (slug)
      communities: ADD CONSTRAINT chk_communities_slug CHECK (validate_slug(slug))

  7.  communities: ADD COLUMN page_content JSONB NOT NULL DEFAULT '{}'::jsonb
      communities: ALTER COLUMN page_content DROP DEFAULT

  8.  users: ADD COLUMN slug TEXT NULL
      users: UPDATE SET slug = generate_unique_slug(name || ' ' || surname, 'users')
      users: ALTER COLUMN slug SET NOT NULL
      users: ADD CONSTRAINT uq_users_slug UNIQUE (slug)
      users: ADD CONSTRAINT chk_users_slug CHECK (validate_slug(slug))

  9.  users: ADD COLUMN page_content JSONB NOT NULL DEFAULT '{}'::jsonb
      users: ALTER COLUMN page_content DROP DEFAULT

  10. users: ADD COLUMN is_page_public BOOLEAN NOT NULL DEFAULT false
      users: ALTER COLUMN is_page_public DROP DEFAULT

  11. DROP FUNCTION generate_unique_slug (cleanup — validate_slug stays permanently)
  ```

- [x] **1.3** Write `downgrade()` — full reverse of every step above:
  - Drop new columns (slug, page_content from both tables; is_page_public from users)
  - Drop constraints (CHECK, UNIQUE on both tables)
  - Re-add dropped columns with original types: `description TEXT NOT NULL`, `established DATE NOT NULL` (with index), `telegram_url TEXT NULL`, `instagram_url TEXT NULL`
  - Rename `owner` back to `head`, restore FK + index
  - Drop both PG functions

- [x] **1.4** Run `uv run alembic upgrade head` locally against a test DB to verify it applies cleanly

---

## Phase 2: Backend ORM Models

- [x] **2.1** `backend/modules/campuscurrent/models/community.py`
  - Rename column `head` → `owner` (keep FK: `ForeignKey("users.sub", ondelete="SET NULL")`)
  - Rename relationship `head_user` → `owner_user`
  - Remove columns: `description`, `established`, `telegram_url`, `instagram_url`
  - Add column: `slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)`
  - Add column: `page_content: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)`
  - Confirm `verified` already exists — do not touch it

- [x] **2.2** `backend/modules/auth/models.py`
  - Add column: `slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)`
  - Add column: `page_content: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)`
  - Add column: `is_page_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)`

---

## Phase 3: Shared Slug Validation (Python)

- [x] **3.1** Create `backend/modules/shared/slug.py` (or `backend/core/validation/slug.py` — pick a location consistent with existing shared utilities)

- [x] **3.2** Implement:
  ```python
  import re

  RESERVED_SLUGS = {
      "edit", "admin", "new", "create", "api", "settings",
      "about", "terms-of-service", "privacy-policy",
      "communities", "users", "events", "courses",
      "announcements", "contacts", "opportunities", "profile", "sgotinish",
  }

  SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

  def validate_slug(slug: str) -> str:
      """Validate a slug. Returns the slug if valid, raises ValueError otherwise."""
      if not SLUG_RE.match(slug):
          raise ValueError("Slug must be lowercase alphanumeric with hyphens (no leading/trailing/double hyphens)")
      if len(slug) < 3 or len(slug) > 50:
          raise ValueError("Slug must be 3–50 characters")
      if slug in RESERVED_SLUGS:
          raise ValueError(f"'{slug}' is a reserved word and cannot be used as a slug")
      return slug
  ```

- [x] **3.3** Import and use this in Pydantic validators for both community and user schemas (Phase 4)

---

## Phase 4: Backend Schemas, Services, Repository, API, Policy, Utils

- [x] **4.1** `backend/modules/campuscurrent/communities/schemas.py`
  - In `CommunityCreateRequest`: rename `head` → `owner`, remove `description`, `established`, `telegram_url`, `instagram_url`, add `slug` (str, validated), add `page_content` (dict, default `{}`)
  - In `BaseCommunity` (response base): rename `head` → `owner`, rename `head_user` → `owner_user`, remove dropped fields, add `slug`, `page_content`
  - In `CommunityResponse`: inherits from BaseCommunity — verify `owner_user: ShortUserResponse`
  - In `ShortCommunityResponse`: remove `description`
  - In `CommunityUpdateRequest`: remove `description`, `established`, `telegram_url`, `instagram_url`, add `slug` (optional), `page_content` (optional)
  - Remove validators: `validate_telegram_url`, `validate_instagram_url` (both on Create and Update)
  - Update `validate_emptiness` field list: remove `description`, `telegram_url`, `instagram_url`
  - Add `@field_validator("slug", mode="before")` calling the shared `validate_slug`

- [x] **4.2** Check for User schemas (search `backend/modules/auth/` for Pydantic models)
  - Add `slug`, `page_content`, `is_page_public` to relevant request/response schemas
  - Add `@field_validator("slug")` using shared `validate_slug`

- [x] **4.3** `backend/modules/campuscurrent/communities/repository.py`
  - All `selectinload(Community.head_user)` → `selectinload(Community.owner_user)` (lines 29, 44, 137, 175, 181)
  - Filter: `Community.head == head_sub` → `Community.owner == owner_sub` (line 132-133)
  - Parameter: `head_sub` → `owner_sub` (line 106)
  - `refresh` default: `["head_user"]` → `["owner_user"]` (line 175)
  - Meilisearch `upsert_search`: remove `"description": community.description` (line 72)

- [x] **4.4** `backend/modules/campuscurrent/communities/service.py`
  - `community_data.head` → `community_data.owner` (lines 51-53)
  - `head_sub` param → `owner_sub` (lines 154, 159, 168)
  - `["head_user"]` → `["owner_user"]` (line 232)
  - `community.head_user` → `community.owner_user` (line 246)

- [x] **4.5** `backend/modules/campuscurrent/communities/api.py`
  - Rename `head_sub` query param → `owner_sub` (lines 54-57)
  - Update docstring (line 33)
  - Update `keyword` description: remove "description" reference (line 61)

- [x] **4.6** `backend/modules/campuscurrent/communities/policy.py`
  - `community_data.head` → `community_data.owner` (lines 50-51)
  - `community.head_user.sub` → `community.owner_user.sub` (line 67-68)

- [x] **4.7** `backend/modules/campuscurrent/communities/utils.py`
  - Rename `"head"` → `"owner"` in editable_fields (lines 28, 46)
  - Remove `"description"`, `"established"`, `"telegram_url"`, `"instagram_url"` from editable_fields (lines 26-30, 44-47)
  - `community.head_user.sub` → `community.owner_user.sub` (line 34)
  - Rename `is_head` → `is_owner` (line 34)

- [x] **4.8** `backend/modules/campuscurrent/communities/og.py`
  - Remove `description` usage (lines 55-57) — find an alternative field for OG description or use `name`

- [x] **4.9** `backend/modules/auth/app_token.py`
  - `Community.head == user_sub` → `Community.owner == user_sub` (line 39)
  - Rename `headed_communities` variable → `owned_communities` (line 41)
  - Update claim key if referenced elsewhere

- [x] **4.10** `backend/modules/campuscurrent/base.py`
  - `_is_community_head` → `_is_community_owner` (line 25) — verify all callers

- [x] **4.11** `backend/modules/campuscurrent/search_indexes.py`
  - Remove `Community.description` from `searchable_columns` (line 13)

- [x] **4.12** `backend/modules/campuscurrent/communities/tests/test_community_url_validation.py`
  - Update test factory: `"head"` → `"owner"`, remove `established`, `description`
  - Add `slug` and `page_content` to test fixtures
  - Remove telegram_url/instagram_url test cases (or keep as regression tests for slug validation)
  - Add slug validation test cases (valid, invalid patterns, reserved words, length, collisions)

---

## Phase 5: Backend Verification

- [x] **5.1** Run `uv run ruff check --fix .` from `backend/` — clean on all modified files (avoided repo-wide `--fix .` churn; reverted 61 unrelated files)
- [x] **5.2** Run `uv run black .` from `backend/` — reformatted only the modified files (migration SQL unchanged by formatting)
- [x] **5.3** Run `uv run pytest` from `backend/` — all tests pass (66 passed for community slug tests in `fastapi` container)
- [x] **5.4** Run `uv run alembic downgrade -1 && uv run alembic upgrade head` to verify round-trip — verified in `fastapi` container; DB back at `8b32e85c3697 (head)`

---

## Phase 6: Frontend Updates (`/web`)

> **IMPORTANT:** `/frontend` is dead legacy code. Do NOT read, edit, or reference it.
> Only `/web` is the active frontend.

- [x] **6.1** `web/src/api/schema.d.ts` — this is auto-generated from the backend OpenAPI schema
  - Regenerated via `pnpm api:generate` from the running dev backend; `head`→`owner`, `head_user`→`owner_user`, removed `description`/`established`/`telegram_url`/`instagram_url`, added `slug`/`page_content`

- [x] **6.2** `web/src/features/communities/types.ts`
  - `COMMUNITY_CREATE_ONLY`: changed `"head"` → `"owner"`
  - Updated JSDoc mentioning `head`

- [x] **6.3** `web/src/features/communities/api.ts`
  - `head_sub: "me"` → `owner_sub: "me"`
  - Updated JSDoc comments referencing "head" (kept historical note about the old `head=` param)

- [x] **6.4** `web/src/features/communities/components/community-form.tsx`
  - Removed Zod fields: `description`, `established`, `telegramUrl`, `instagramUrl`
  - Removed from `toValues`, watchers/register, create payload, update payload
  - Renamed `head: "me"` → `owner: "me"` in create payload
  - Removed form fields from JSX: description textarea, established input, telegram input, instagram input
  - Added `slug` field (text input, auto-normalised, validated against reserved list + pattern)
  - `page_content`: left as `{}` (no block editor component yet — TODO)

- [x] **6.5** `web/src/features/communities/components/community-card.tsx`
  - Removed `{toPlainText(community.description)}` preview (no `description` field; `page_content` is a JSON dict, not markdown)

- [x] **6.6** `web/src/routes/_app/communities/$communityId.tsx`
  - Renamed label "Community head" → "Community owner"
  - Renamed `community.head_user.name` → `community.owner_user.name`
  - Replaced "About us" (`community.description`) with a static placeholder
  - Removed `community.established` rendering (+ `CalendarIcon`, `formatCampusDate` imports)
  - Removed `community.telegram_url` / `community.instagram_url` rendering (+ `ExternalLink`, `ExternalLinkIcon`)
  - Updated comment referencing "head"
  - Contact section now renders email only

- [x] **6.7** `web/src/routes/_app/communities/index.tsx`
  - Updated comment "makes you its head" → "makes you its owner"

- [x] **6.8** `web/src/routes/_app/profile.tsx`
  - Changed "You don't head any community" → "You don't own any community" (+ description)

- [x] **6.9** `web/src/features/communities/url-validation.ts`
  - Kept `getTelegramUrlError` / `getInstagramUrlError` functions (now referenced only by their own test — the form no longer imports them); decoupled dead code left in place per plan directive

---

## Phase 7: Frontend Verification

- [x] **7.1** Run `npm run build` from `web/` — no TypeScript errors (build + `tsc -b --noEmit` both pass)
- [x] **7.2** Run any lint commands configured in `web/package.json` — `pnpm lint` (oxlint) and Prettier `--check` both clean; `pnpm test` passes (57 tests)
- [x] **7.3** Manually verify the dev server starts — dev backend serving updated OpenAPI confirmed (generated `schema.d.ts` reflects `owner`/`slug`/`page_content`); frontend dev server runs via the `infra` stack

---

## Phase 8: Commit

- [x] **8.1** Review all changed files with `git diff --stat` — 23 modified (15 backend + 8 frontend) + migration + `shared/` module + plan; no unrelated churn
- [x] **8.2** Commit with conventional commit message: `feat: refactor community/user schema — slug, page_content, owner rename` (commit `0f05a02`)
- [x] **8.3** Push to `f/puck-integration` (fork branch tracking `upstream/dev`, per user instruction) — pushed `85a0db2..0f05a02` to `origin`

---

## Reference: All files that need changes

### Backend (14 files)

| File | Changes |
|------|---------|
| `backend/migrations/versions/<new>.py` | New migration file |
| `backend/modules/campuscurrent/models/community.py` | Rename head→owner, drop 4 cols, add 2 cols |
| `backend/modules/auth/models.py` | Add 3 columns |
| `backend/modules/shared/slug.py` | **New file** — shared slug validation |
| `backend/modules/campuscurrent/communities/schemas.py` | Rename head→owner, drop/add fields, remove validators |
| `backend/modules/campuscurrent/communities/repository.py` | head→owner references, drop description from search |
| `backend/modules/campuscurrent/communities/service.py` | head→owner references |
| `backend/modules/campuscurrent/communities/api.py` | head_sub→owner_sub, docstrings |
| `backend/modules/campuscurrent/communities/policy.py` | head→owner permission checks |
| `backend/modules/campuscurrent/communities/utils.py` | head→owner, editable_fields cleanup |
| `backend/modules/campuscurrent/communities/og.py` | Remove description usage |
| `backend/modules/auth/app_token.py` | Community.head→Community.owner query |
| `backend/modules/campuscurrent/base.py` | _is_community_head→_is_community_owner |
| `backend/modules/campuscurrent/search_indexes.py` | Remove description from searchable_columns |
| `backend/modules/campuscurrent/communities/tests/test_community_url_validation.py` | Update fixtures + add slug tests |

### Frontend (8 files)

| File | Changes |
|------|---------|
| `web/src/api/schema.d.ts` | Regenerate or manually update types |
| `web/src/features/communities/types.ts` | head→owner in CREATE_ONLY |
| `web/src/features/communities/api.ts` | head_sub→owner_sub, comments |
| `web/src/features/communities/components/community-form.tsx` | Remove 4 fields, rename head→owner, add slug |
| `web/src/features/communities/components/community-card.tsx` | Remove description rendering |
| `web/src/routes/_app/communities/$communityId.tsx` | Rename head→owner, remove dropped fields |
| `web/src/routes/_app/communities/index.tsx` | Comment update |
| `web/src/routes/_app/profile.tsx` | Empty state text update |

---

## Reference: Alembic conventions in this repo

- **Revision IDs:** 12-char hex auto-generated by Alembic
- **Typing:** `Union[str, Sequence[str], None]` for revision fields
- **Imports:** `from alembic import op`, `import sqlalchemy as sa`, `from sqlalchemy.dialects import postgresql`
- **Downgrades:** always fully reversible
- **DB URL:** resolved at runtime from `backend.core.configs.config.config.DATABASE_URL` (strips `+asyncpg`)
- **Model metadata:** `Base.metadata` after `import_models()` from `backend.core.database.model_registry`
- **Safe NOT NULL pattern:** add with `server_default`, backfill, then `alter_column` to drop default + set nullable=False

---

## Reference: Slug blocklist rationale

Routes found under `/communities/`: only `/communities/` (index) and `/communities/$communityId` (dynamic numeric). No static sub-routes.

Routes found under `/users/`: none exist yet.

Root-level static paths (would collide if user/community profiles get public routes): `about`, `terms-of-service`, `privacy-policy`.

All app route segments added to blocklist to prevent future collisions.

---

## Progress log

Update this section as you work:

```
[x] Started: ___9/3/2026___
[x] Phase 1 (migration): ___done — applied+downgrade+re-upgrade verified against dev DB___
[x] Phase 2 (ORM models): ___done — community.py + auth/models.py updated___
[x] Phase 3 (slug validation): ___done — shared/slug.py (validate_slug, generate_unique_slug)___
[x] Phase 4 (schemas/services/etc): ___done — communities + auth + base + search_indexes___
[x] Phase 5 (backend verification): ___done — ruff/black clean on changed files, 66 tests pass, app import OK, alembic round-trip verified___
[x] Phase 6 (frontend): ___done — schema.d.ts regenerated; types/api/form/card/routes/profile updated (head→owner, slug, removed dropped fields)___
[x] Phase 7 (frontend verification): ___done — tsc/build pass, oxlint+prettier clean, 57 tests pass, api:check in sync___
[x] Phase 8 (commit): ___done — commit 0f05a02 pushed to origin/f/puck-integration___
```
