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
