"""Profile pages: the viewer's own settings and design, and a profile read by handle.

`/me/profile*` are the viewer's own and need a session. `/profiles/{handle}` is
what `my.nuspace.kz/u/<handle>` reads, and answers 404 both when no one holds
the handle and when the viewer may not read it, so a hidden profile's existence
is never confirmed.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.exc import IntegrityError

from backend.modules.auth.dependencies import get_creds_or_401, get_creds_or_guest
from backend.modules.profiles import schemas
from backend.modules.profiles.dependencies import get_profile_service
from backend.modules.profiles.service import ProfileService, raise_handle_taken

router = APIRouter(tags=["Profile Routes"])

SignedIn = Annotated[tuple[dict, dict], Depends(get_creds_or_401)]
Service = Annotated[ProfileService, Depends(get_profile_service)]


@router.get("/me/profile", response_model=schemas.ProfileSettingsResponse)
async def get_my_profile(user: SignedIn, service: Service) -> schemas.ProfileSettingsResponse:
    """The viewer's handle, profile visibility and design (null until first saved)."""
    return await service.get_settings(user[0]["sub"])


@router.patch("/me/profile", response_model=schemas.ProfileSettingsResponse)
async def update_my_profile(
    body: schemas.ProfileSettingsUpdate, user: SignedIn, service: Service
) -> schemas.ProfileSettingsResponse:
    """Set or change the handle, or the profile's visibility.

    422 for a malformed or reserved handle, 409 for one someone else holds.
    """
    try:
        return await service.update_settings(user[0]["sub"], body)
    except IntegrityError:
        raise_handle_taken()


@router.put("/me/profile/content", response_model=schemas.ProfileSettingsResponse)
async def save_my_profile_content(
    body: schemas.ProfileContentUpdate, user: SignedIn, service: Service
) -> schemas.ProfileSettingsResponse:
    """Save the design the profile editor publishes."""
    return await service.save_content(user[0]["sub"], body.content)


@router.get("/profiles/{handle}", response_model=schemas.ProfileResponse)
async def read_profile(
    handle: str,
    viewer: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: Service,
) -> schemas.ProfileResponse:
    """A profile page: the identity header, read live from `users`, and the design."""
    return await service.read(handle, viewer)
