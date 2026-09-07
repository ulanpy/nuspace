from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError

from backend.common.dependencies import get_infra
from backend.common.schemas import Infra
from backend.modules.auth.dependencies import get_creds_or_401, get_creds_or_guest
from backend.modules.campuscurrent.communities import schemas
from backend.modules.campuscurrent.communities.dependencies import get_community_service
from backend.modules.campuscurrent.communities.service import CommunityService
from backend.modules.campuscurrent.models.community import (
    CommunityCategory,
    CommunityType,
)

router = APIRouter(tags=["Community Routes"])

# The only unique, user-writable column on Community is `slug`, so an
# IntegrityError raised while creating or updating a community means the handle
# is already taken. Surface that to the caller instead of leaking the raw
# database message.
SLUG_TAKEN_DETAIL = "That handle is already taken. Choose a different one."


def _raise_slug_taken() -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=SLUG_TAKEN_DETAIL,
    )


@router.post("/communities", response_model=schemas.CommunityResponse)
async def add_community(
    request: Request,
    community_data: schemas.CommunityCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
) -> schemas.CommunityResponse:
    """
    Create a new community. Any registered user can create communities.

    **Access Policy:**
    - Any registered user can create communities
    - Users can only create communities for themselves (owner must be "me" or their own sub)
    """
    try:
        return await community_service.create_community(
            infra=infra, community_data=community_data, user=user
        )
    except IntegrityError:
        _raise_slug_taken()


@router.get("/communities", response_model=schemas.ListCommunity)
async def get_communities(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    community_type: CommunityType | None = None,
    community_category: CommunityCategory | None = None,
    owner_sub: str | None = Query(
        default=None,
        description=("if 'me' then current user's sub will be used"),
    ),
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
    keyword: str | None = Query(default=None, description="Search keyword for community name"),
) -> schemas.ListCommunity:
    """Retrieves a paginated list of communities with flexible filtering."""
    return await community_service.list_communities(
        infra=infra,
        user=user,
        page=page,
        size=size,
        community_type=community_type,
        community_category=community_category,
        owner_sub=owner_sub,
        keyword=keyword,
    )


@router.get("/communities/{slug}", response_model=schemas.CommunityResponse)
async def get_community(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
) -> schemas.CommunityResponse:
    """Retrieves a specific community by slug."""
    return await community_service.get_community_response(infra=infra, slug=slug, user=user)


@router.patch("/communities/{slug}", response_model=schemas.CommunityResponse)
async def update_community(
    request: Request,
    slug: str,
    new_data: schemas.CommunityUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
) -> schemas.CommunityResponse:
    """Updates fields of an existing community. Head or admin only."""
    try:
        return await community_service.update_community(
            infra=infra, slug=slug, new_data=new_data, user=user
        )
    except IntegrityError:
        _raise_slug_taken()


@router.delete("/communities/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_community(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
):
    """Deletes a community. Admin only."""
    await community_service.delete_community(infra=infra, slug=slug, user=user)


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


@router.get("/communities/{slug}/admin-link", response_model=schemas.AdminLinkResponse)
async def get_community_admin_link(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
) -> schemas.AdminLinkResponse:
    """Get a shareable admin access link for the community. Owner or admin only."""
    return await community_service.view_admin_link(infra=infra, slug=slug, user=user)


@router.post("/communities/{slug}/admin-link/rotate", response_model=schemas.AdminLinkResponse)
async def rotate_community_admin_link(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
) -> schemas.AdminLinkResponse:
    """Rotate the admin access link, invalidating the previous one. Owner or admin only."""
    return await community_service.rotate_admin_link(infra=infra, slug=slug, user=user)


@router.delete("/communities/{slug}/admins/me", response_model=schemas.CommunityResponse)
async def leave_community_admin(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
) -> schemas.CommunityResponse:
    """Leave a community as an admin. Owner cannot leave this way."""
    return await community_service.leave_admin(infra=infra, slug=slug, user=user)


@router.delete("/communities/{slug}/admins/{user_sub}", response_model=schemas.CommunityResponse)
async def remove_community_admin(
    request: Request,
    slug: str,
    user_sub: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
) -> schemas.CommunityResponse:
    """Remove an admin from a community. Site-admin or owner only."""
    return await community_service.remove_admin(
        infra=infra, slug=slug, user_sub=user_sub, user=user
    )


@router.post("/communities/admin-links/accept", response_model=schemas.AdminLinkAcceptResponse)
async def accept_community_admin_link(
    request: Request,
    body: schemas.AdminLinkAcceptRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
) -> schemas.AdminLinkAcceptResponse:
    """Redeem an admin access link. Idempotent; no-op if already admin or owner."""
    return await community_service.accept_admin_link(infra=infra, token=body.token, user=user)
