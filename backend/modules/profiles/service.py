from fastapi import HTTPException, status

from backend.core.database.uow import UnitOfWork
from backend.modules.auth.models import User, UserRole
from backend.modules.profiles import schemas
from backend.modules.profiles.repository import ProfileRepository
from backend.modules.shared.visibility import RecordVisibility, visible_to

HANDLE_TAKEN_DETAIL = "That handle is already taken. Choose a different one."
PROFILE_NOT_FOUND_DETAIL = "Profile not found"

# The Student Government hierarchy, which the identity header names.
SG_ROLES = frozenset({UserRole.boss, UserRole.capo, UserRole.soldier})


def _settings(user: User) -> schemas.ProfileSettingsResponse:
    return schemas.ProfileSettingsResponse(
        handle=user.handle,
        visibility=user.profile_visibility,
        content=user.profile_content,
    )


class ProfileService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def _own(self, repo: ProfileRepository, sub: str) -> User:
        user = await repo.get_by_sub(sub)
        if user is None:
            # Signed in without a `users` row: the app token is issued only after
            # the row is ensured, so this is an account deleted mid-session.
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    async def get_settings(self, sub: str) -> schemas.ProfileSettingsResponse:
        async with self.uow:
            user = await self._own(self.uow.get_repo(ProfileRepository), sub)
            return _settings(user)

    async def update_settings(
        self, sub: str, update: schemas.ProfileSettingsUpdate
    ) -> schemas.ProfileSettingsResponse:
        """Rename, take down (`handle: null`) or retier the viewer's profile.

        No redirect is kept for an old handle: the settings screen says so.
        """
        async with self.uow:
            repo = self.uow.get_repo(ProfileRepository)
            user = await self._own(repo, sub)
            if "handle" in update.model_fields_set:
                if update.handle is not None and await repo.handle_taken(
                    update.handle, by_other_than=sub
                ):
                    raise_handle_taken()
                user.handle = update.handle
            if update.visibility is not None:
                user.profile_visibility = update.visibility
            # Inside the transaction, so a race on the unique index surfaces as
            # an IntegrityError the route turns into the same 409.
            await repo.flush()
            return _settings(user)

    async def save_content(self, sub: str, content: dict) -> schemas.ProfileSettingsResponse:
        async with self.uow:
            repo = self.uow.get_repo(ProfileRepository)
            user = await self._own(repo, sub)
            user.profile_content = content
            await repo.flush()
            return _settings(user)

    async def read(self, handle: str, viewer: tuple[dict, dict]) -> schemas.ProfileResponse:
        """A profile page by handle, or 404 for anyone `visible_to` turns away.

        For a profile, `private` means the person and site admins: the person
        is the record's only manager.
        """
        async with self.uow:
            user = await self.uow.get_repo(ProfileRepository).get_by_handle(handle)
            if user is None or not visible_to(
                viewer, RecordVisibility(tier=user.profile_visibility, managers={user.sub})
            ):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=PROFILE_NOT_FOUND_DETAIL
                )
            return schemas.ProfileResponse(
                handle=handle,
                name=user.name,
                surname=user.surname,
                picture=user.picture or None,
                department=user.department.name if user.department else None,
                sg_role=user.role.value if user.role in SG_ROLES else None,
                content=user.profile_content,
                can_edit=viewer[0].get("sub") == user.sub,
            )


def raise_handle_taken() -> None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=HANDLE_TAKEN_DETAIL)
