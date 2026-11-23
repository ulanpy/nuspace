from fastapi import HTTPException, status

from backend.core.database.uow import UnitOfWork
from backend.modules.auth.models import User, UserRole
from backend.modules.media.interfaces import ObjectStorage
from backend.modules.profiles import schemas
from backend.modules.profiles.media import ProfileMediaSlot, is_own_upload
from backend.modules.profiles.repository import ProfileRepository
from backend.modules.shared.visibility import RecordVisibility, tiers_open_to, visible_to

HANDLE_TAKEN_DETAIL = "That handle is already taken. Choose a different one."
PROFILE_NOT_FOUND_DETAIL = "Profile not found"

# The Student Government hierarchy, which the identity header names.
SG_ROLES = frozenset({UserRole.boss, UserRole.capo, UserRole.soldier})


class ProfileService:
    def __init__(self, uow: UnitOfWork, storage: ObjectStorage):
        self.uow = uow
        self.storage = storage

    async def _settings(self, user: User) -> schemas.ProfileSettingsResponse:
        picture, banner = await self._urls(user)
        return schemas.ProfileSettingsResponse(
            handle=user.handle,
            visibility=user.profile_visibility,
            content=user.profile_content,
            picture=picture,
            banner=banner,
        )

    async def _urls(self, user: User) -> tuple[str | None, str | None]:
        """Download URLs for the custom picture and banner, in that order.

        The picture falls back to the sign-in avatar; the banner has no fallback.
        """
        names = [name for name in (user.profile_picture, user.profile_banner) if name]
        urls = iter(await self.storage.generate_download_urls(names))
        picture = next(urls) if user.profile_picture else user.picture or None
        banner = next(urls) if user.profile_banner else None
        return picture, banner

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
            return await self._settings(user)

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
            return await self._settings(user)

    async def save_content(self, sub: str, content: dict) -> schemas.ProfileSettingsResponse:
        async with self.uow:
            repo = self.uow.get_repo(ProfileRepository)
            user = await self._own(repo, sub)
            user.profile_content = content
            await repo.flush()
            return await self._settings(user)

    async def confirm_media(
        self, sub: str, slot: ProfileMediaSlot, filename: str
    ) -> schemas.ProfileSettingsResponse:
        """Point the picture or banner at an object the viewer just uploaded.

        Only a name `/bucket/upload-url` could have issued to this person is
        accepted. The replaced object is deleted once the new one is stored.
        """
        if not is_own_upload(slot, sub, filename):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="That upload was not issued to you",
            )
        column = "profile_picture" if slot == "picture" else "profile_banner"
        async with self.uow:
            repo = self.uow.get_repo(ProfileRepository)
            user = await self._own(repo, sub)
            replaced = getattr(user, column)
            setattr(user, column, filename)
            await repo.flush()
            response = await self._settings(user)
        if replaced and replaced != filename:
            await self.storage.delete_object(replaced)
        return response

    async def list_directory(
        self, viewer: tuple[dict, dict], *, keyword: str | None, page: int, size: int
    ) -> schemas.ProfileList:
        """The people directory: the profile pages this viewer may open, and only those.

        Rows and `total` ask the one predicate through `tiers_open_to`, so the
        count never includes a profile a read by handle would 404.
        """
        async with self.uow:
            users, total = await self.uow.get_repo(ProfileRepository).list_listed(
                tiers=tiers_open_to(viewer), keyword=keyword, page=page, size=size
            )
            return schemas.ProfileList(
                items=[
                    schemas.ProfileListItem(
                        handle=user.handle,
                        name=user.name,
                        surname=user.surname,
                        picture=user.picture or None,
                        department=user.department.name if user.department else None,
                    )
                    for user in users
                ],
                total_pages=max(1, -(-total // size)),
                total=total,
                page=page,
                size=size,
                has_next=page * size < total,
            )

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
            picture, banner = await self._urls(user)
            return schemas.ProfileResponse(
                handle=handle,
                name=user.name,
                surname=user.surname,
                picture=picture,
                banner=banner,
                department=user.department.name if user.department else None,
                sg_role=user.role.value if user.role in SG_ROLES else None,
                content=user.profile_content,
                can_edit=viewer[0].get("sub") == user.sub,
            )


def raise_handle_taken() -> None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=HANDLE_TAKEN_DETAIL)
