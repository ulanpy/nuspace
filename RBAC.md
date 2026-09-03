# Admin Authorization Backend Plan

> **Goal:** Add admin-only capabilities (reassign community owner, toggle verified, ban/allow users) and enforce banned-user restrictions globally.
>
> **Working branch:** `dev`
>
> **Convention:** Reuse existing patterns — Policy classes in service methods, `get_creds_or_401` for auth, `ResourcePermissions` for frontend hints. No new patterns.

---

## Context

- **Authorization pattern:** Policy classes instantiated in service methods. `CommunityPolicy(user=user).check_permission(action, community=community)` raises HTTP 403 on failure. Admin bypass already exists at `CommunityPolicy` line 42.
- **Auth flow:** `get_creds_or_401` returns `(kc_principal, app_principal)`. `app_principal` carries `role` (string) and `communities` (list of ints) from JWT.
- **User model:** `backend/modules/auth/models.py` — has `role` (UserRole enum) and `scope` (UserScope enum: `allowed` | `banned`).
- **Community model:** `backend/modules/campuscurrent/models/community.py` — has `owner` (FK to users.sub), `verified` (bool), `page_content` (JSONB), `slug`.
- **`verified` column:** Exists on Community model but no endpoint writes to it.
- **`scope` column:** Exists on User model. Only checked in `bot/services/event_post.py` (banned users can't post events). Not checked in web API auth flow.
- **`ResourcePermissions` schema:** `backend/common/schemas.py` — returned with community responses, tells frontend what the current user can do.
- **No user profile edit endpoints exist.** Admin manages users via scope (ban/allow), not by editing profile fields.
- **`campuscurrent/profile/api.py`** is an empty test endpoint — unused shell.

---

## Checklist

### Phase 1: Permission Hints (ResourcePermissions)

- [x] **1.1** Add `can_change_owner: bool = False` and `can_toggle_verified: bool = False` fields to `ResourcePermissions` in `backend/common/schemas.py`
- [x] **1.2** Update `get_community_permissions()` in `backend/modules/campuscurrent/communities/utils.py`:
  - Admin branch: set `can_change_owner=True`, `can_toggle_verified=True`
  - Owner branch: leave both as `False`

### Phase 2: Community Schemas

- [x] **2.1** Add to `backend/modules/campuscurrent/communities/schemas.py`:
  ```python
  class CommunityOwnerUpdateRequest(BaseModel):
      owner_sub: str = Field(..., description="Sub of the new owner user")

  class CommunityVerifiedUpdateRequest(BaseModel):
      verified: bool = Field(..., description="New verified status")
  ```

### Phase 3: Community Policy

- [x] **3.1** In `backend/modules/campuscurrent/communities/policy.py`, fix the enum/string inconsistency on line 77: change `UserRole.admin.value` to `UserRole.admin` to match line 42's style.
- [x] **3.2** Add a `check_admin_only` method to `CommunityPolicy` for the two new admin-only actions:
  ```python
  async def check_admin_only(self) -> bool:
      if self.user_role == UserRole.admin:
          return True
      raise HTTPException(
          status_code=status.HTTP_403_FORBIDDEN,
          detail="Only admins can perform this action",
      )
  ```
  This is called by the service methods for owner reassignment and verified toggle. The existing `check_permission(UPDATE)` admin bypass at line 42 already covers general field edits — these new actions are separate endpoints with their own policy check.

### Phase 4: Community Repository

- [x] **4.1** Verify `get_user_by_sub()` exists in `backend/modules/campuscurrent/communities/repository.py` (line 194). It does — reuse it, no changes needed.

### Phase 5: Community Service

- [x] **5.1** Add `reassign_owner()` to `CommunityService` in `backend/modules/campuscurrent/communities/service.py`:
  ```python
  async def reassign_owner(
      self, infra: Infra, slug: str, new_owner_sub: str, user: tuple[dict, dict]
  ) -> schemas.CommunityResponse:
      async with self.uow:
          repo = self.uow.get_repo(CommunityRepository)
          community = await repo.get_by_slug(slug)
          if community is None:
              raise HTTPException(status_code=404, detail="Community not found")
          await CommunityPolicy(user=user).check_admin_only()
          target_user = await repo.get_user_by_sub(new_owner_sub)
          if target_user is None:
              raise HTTPException(status_code=404, detail="Target user not found")
          community.owner = new_owner_sub
      await repo.upsert_search(infra.meilisearch_client, community)
      return await self._build_community_response(community, infra, user)
  ```
- [x] **5.2** Add `toggle_verified()` to `CommunityService`:
  ```python
  async def toggle_verified(
      self, infra: Infra, slug: str, verified: bool, user: tuple[dict, dict]
  ) -> schemas.CommunityResponse:
      async with self.uow:
          repo = self.uow.get_repo(CommunityRepository)
          community = await repo.get_by_slug(slug)
          if community is None:
              raise HTTPException(status_code=404, detail="Community not found")
          await CommunityPolicy(user=user).check_admin_only()
          community.verified = verified
      return await self._build_community_response(community, infra, user)
  ```

### Phase 6: Community Endpoints

- [x] **6.1** Add to `backend/modules/campuscurrent/communities/api.py`:
  ```python
  @router.patch("/communities/{slug}/owner", response_model=schemas.CommunityResponse)
  async def reassign_community_owner(
      request: Request,
      slug: str,
      body: schemas.CommunityOwnerUpdateRequest,
      user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
      infra: Infra = Depends(get_infra),
      community_service: CommunityService = Depends(get_community_service),
  ) -> schemas.CommunityResponse:
      """Reassign community owner. Admin only."""
      return await community_service.reassign_owner(
          infra=infra, slug=slug, new_owner_sub=body.owner_sub, user=user
      )

  @router.patch("/communities/{slug}/verified", response_model=schemas.CommunityResponse)
  async def toggle_community_verified(
      request: Request,
      slug: str,
      body: schemas.CommunityVerifiedUpdateRequest,
      user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
      infra: Infra = Depends(get_infra),
      community_service: CommunityService = Depends(get_community_service),
  ) -> schemas.CommunityResponse:
      """Toggle community verified status. Admin only."""
      return await community_service.toggle_verified(
          infra=infra, slug=slug, verified=body.verified, user=user
      )
  ```

### Phase 7: User Scope — Schemas & Repository

- [x] **7.1** Add to `backend/modules/auth/schemas.py`:
  ```python
  class UserScopeUpdateRequest(BaseModel):
      scope: UserScope = Field(..., description="New scope: 'allowed' or 'banned'")

  class UserScopeResponse(BaseModel):
      sub: str
      scope: UserScope
  ```
- [x] **7.2** Add `update_scope()` to `UserRepository` in `backend/modules/auth/repository.py`:
  ```python
  async def update_scope(self, sub: str, scope: UserScope) -> User | None:
      user = await self.get_by_sub(sub)
      if user is None:
          return None
      user.scope = scope
      if scope == UserScope.banned:
          user.is_page_public = False
      await self.db_session.flush()
      await self.db_session.refresh(user)
      return user
  ```

### Phase 8: User Scope — Service

- [x] **8.1** Add `update_user_scope()` to `AuthService` in `backend/modules/auth/service.py`:
  ```python
  async def update_user_scope(
      self, target_sub: str, new_scope: UserScope, admin_sub: str
  ) -> User:
      if target_sub == admin_sub:
          raise HTTPException(
              status_code=status.HTTP_400_BAD_REQUEST,
              detail="Admins cannot change their own scope",
          )
      async with self.uow:
          user_repo = self.uow.get_repo(UserRepository)
          user = await user_repo.update_scope(target_sub, new_scope)
      if user is None:
          raise HTTPException(
              status_code=status.HTTP_404_NOT_FOUND,
              detail="User not found",
          )
      return user
  ```

### Phase 9: User Scope — Endpoint

- [x] **9.1** Add to `backend/modules/auth/api.py`:
  ```python
  @router.patch("/users/{sub}/scope", response_model=UserScopeResponse)
  async def update_user_scope(
      sub: str,
      body: UserScopeUpdateRequest,
      user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
      auth_service: AuthService = Depends(deps.get_auth_service),
  ) -> UserScopeResponse:
      """Ban or allow a user. Admin only."""
      if user[1].get("role") != UserRole.admin.value:
          raise HTTPException(
              status_code=status.HTTP_403_FORBIDDEN,
              detail="Only admins can change user scope",
          )
      updated = await auth_service.update_user_scope(
          target_sub=sub, new_scope=body.scope, admin_sub=user[0]["sub"]
      )
      return UserScopeResponse(sub=updated.sub, scope=updated.scope)
  ```
  Note: Role check here uses the app token value (string), consistent with `utils.py` line 18 pattern. This avoids a DB round-trip for the role check since the JWT is already validated.

### Phase 10: Banned User Enforcement (Global)

- [x] **10.1** In `backend/modules/auth/dependencies.py`, add a scope check inside `get_creds_or_401`, **after** the app principal is established (after line 201, before `set_request_access_actor`):

  ```python
  # After app_principal is validated, check if user is banned
  if app_principal.get("sub"):
      _uow = UnitOfWork(
          session_factory=request.app.state.db_manager.get_session_maker()
      )
      _auth_svc = AuthService(_uow, kc_manager, app_token_manager)
      _user = await _auth_svc.get_user_by_sub(app_principal["sub"])
      if _user and _user.scope == UserScope.banned:
          raise HTTPException(
              status_code=status.HTTP_403_FORBIDDEN,
              detail="Your account has been banned",
          )
  ```

  **Optimization note:** This adds a DB query on every authenticated request. To avoid this:
  - [x] **10.1a (preferred)** Add a `get_user_by_sub()` method to `AuthService` (or reuse the existing one via `ensure_user_from_kc_principal` pattern). Then refactor `get_creds_or_401` to check scope only when issuing/refreshing the app token, and embed the scope in the JWT claims. This way banned users are caught on token refresh, and the check is free on subsequent requests.
  - [ ] **10.1b (simpler)** Do the DB check on every request as shown above. Acceptable if request volume is moderate.

  **Decision:** Go with **10.1a** — embed scope in the app token. This means:
  - Modify `AppTokenManager.create_app_token()` in `backend/modules/auth/app_token.py` to include `scope` in JWT claims
  - In `get_creds_or_401`, after validating the app token, check `app_principal.get("scope") == "banned"` → raise 403
  - When scope changes via `PATCH /users/{sub}/scope`, the effect takes place on the user's next token refresh (not immediately). This is acceptable for a ban — the current session will expire within the token TTL.

- [x] **10.2** Update `AppTokenManager.create_app_token()` in `backend/modules/auth/app_token.py`:
  - Query user's `scope` from DB (already done — user is loaded for `role` and `communities`)
  - Add `scope` to the JWT claims dict

- [x] **10.3** In `get_creds_or_401` (`backend/modules/auth/dependencies.py`), after app token validation succeeds (around line 158-162), add:
  ```python
  if app_principal.get("scope") == UserScope.banned.value:
      raise HTTPException(
          status_code=status.HTTP_403_FORBIDDEN,
          detail="Your account has been banned",
      )
  ```

- [x] **10.4** Update `get_creds_or_guest` guest fallback to include `"scope": "allowed"` in the guest principal dict (line 223).

### Phase 11: Lint & Verify

- [x] **11.1** Run `uv run ruff check --fix .` in `backend/`
- [x] **11.2** Run `uv run black .` in `backend/`
- [x] **11.3** Run `uv run pytest` in `backend/` to ensure no regressions

---

## Files Modified

| # | File | Action |
|---|---|---|
| 1 | `backend/common/schemas.py` | Add `can_change_owner`, `can_toggle_verified` to `ResourcePermissions` |
| 2 | `backend/modules/campuscurrent/communities/schemas.py` | Add `CommunityOwnerUpdateRequest`, `CommunityVerifiedUpdateRequest` |
| 3 | `backend/modules/campuscurrent/communities/policy.py` | Add `check_admin_only()`, fix enum/string inconsistency |
| 4 | `backend/modules/campuscurrent/communities/service.py` | Add `reassign_owner()`, `toggle_verified()` |
| 5 | `backend/modules/campuscurrent/communities/api.py` | Add 2 new PATCH endpoints |
| 6 | `backend/modules/campuscurrent/communities/utils.py` | Add `can_change_owner`, `can_toggle_verified` to permissions |
| 7 | `backend/modules/auth/schemas.py` | Add `UserScopeUpdateRequest`, `UserScopeResponse` |
| 8 | `backend/modules/auth/repository.py` | Add `update_scope()` |
| 9 | `backend/modules/auth/service.py` | Add `update_user_scope()` |
| 10 | `backend/modules/auth/api.py` | Add `PATCH /users/{sub}/scope` endpoint |
| 11 | `backend/modules/auth/app_token.py` | Add `scope` to JWT claims |
| 12 | `backend/modules/auth/dependencies.py` | Add banned-user check in `get_creds_or_401`, update guest fallback |

---

## Notes

- **No migration needed.** All columns (`scope`, `verified`, `owner`, `page_content`, `slug`) already exist in the DB.
- **No frontend work** in this task. The `ResourcePermissions` hints are ready for when the admin UI is built.
- **Scope propagation delay:** When a user is banned, their current app token remains valid until expiry. The ban takes full effect on next token refresh. This is acceptable — the token TTL is short.
- **Admin cannot ban self:** The `update_user_scope` service method rejects `target_sub == admin_sub`.
- **Banning sets `is_page_public = False`:** Ensures banned profiles are not publicly visible.
