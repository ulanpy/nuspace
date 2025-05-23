from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session
from backend.routes.communities.schemas.posts import (
    CommunityPostRequestSchema,
    CommunityPostResponseSchema,
    ListCommunityPostResponseSchema,
)

router = APIRouter(tags=["Community Posts"])


@router.post("/posts", response_model=CommunityPostResponseSchema)
async def create_post(
    post_data: CommunityPostRequestSchema,
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityPostResponseSchema:
    # TODO: Implement post creation logic
    pass


@router.get("/posts", response_model=ListCommunityPostResponseSchema)
async def get_posts(
    community_id: int = Query(...),
    size: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    db_session: AsyncSession = Depends(get_db_session),
) -> ListCommunityPostResponseSchema:
    # TODO: Implement post listing logic
    pass


@router.get("/posts/{post_id}", response_model=CommunityPostResponseSchema)
async def get_post(
    post_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityPostResponseSchema:
    # TODO: Implement get single post logic
    pass


@router.patch("/posts/{post_id}", response_model=CommunityPostResponseSchema)
async def update_post(
    post_id: int,
    post_data: CommunityPostRequestSchema,
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityPostResponseSchema:
    # TODO: Implement post update logic
    pass


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db_session: AsyncSession = Depends(get_db_session),
):
    # TODO: Implement post deletion logic
    pass
