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
    - Users can only create communities for themselves (head must be "me" or their own sub)
    """
    try:
        return await community_service.create_community(
            infra=infra, community_data=community_data, user=user
        )
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
        )


@router.get("/communities", response_model=schemas.ListCommunity)
async def get_communities(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    community_type: CommunityType | None = None,
    community_category: CommunityCategory | None = None,
    head_sub: str | None = Query(
        default=None,
        description=("if 'me' then current user's sub will be used"),
    ),
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
    keyword: str | None = Query(
        default=None, description="Search keyword for community name or description"
    ),
) -> schemas.ListCommunity:
    """Retrieves a paginated list of communities with flexible filtering."""
    return await community_service.list_communities(
        infra=infra,
        user=user,
        page=page,
        size=size,
        community_type=community_type,
        community_category=community_category,
        head_sub=head_sub,
        keyword=keyword,
    )


@router.get("/communities/{community_id}", response_model=schemas.CommunityResponse)
async def get_community(
    request: Request,
    community_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
) -> schemas.CommunityResponse:
    """Retrieves a specific community by ID."""
    return await community_service.get_community_response(
        infra=infra, community_id=community_id, user=user
    )


@router.patch("/communities/{community_id}", response_model=schemas.CommunityResponse)
async def update_community(
    request: Request,
    community_id: int,
    new_data: schemas.CommunityUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
) -> schemas.CommunityResponse:
    """Updates fields of an existing community. Head or admin only."""
    return await community_service.update_community(
        infra=infra, community_id=community_id, new_data=new_data, user=user
    )


@router.delete("/communities/{community_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_community(
    request: Request,
    community_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    community_service: CommunityService = Depends(get_community_service),
):
    """Deletes a community. Admin only."""
    await community_service.delete_community(
        infra=infra, community_id=community_id, user=user
    )
