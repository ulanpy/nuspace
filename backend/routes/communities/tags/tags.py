from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.common.utils import response_builder
from backend.core.database.models import CommunityPostTag
from backend.routes.communities.tags.dependencies import tag_exists_or_404
from backend.routes.communities.tags.policy import ResourceAction, TagPolicy
from backend.routes.communities.tags.schemas import (
    CommunityTagRequest,
    CommunityTagResponse,
    ListCommunityTagResponse,
)

router = APIRouter(tags=["Community Tags"])


@router.post("/tags", response_model=CommunityTagResponse)
async def create_tag(
    tag_data: CommunityTagRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityTagResponse:
    """
    Create a new tag for a community.

    **Access Policy:**
    - All authenticated users can create tags (for now)
    - This can be enhanced later to check for community membership, admin status, etc.

    **Parameters:**
    - `tag_data`: Tag data including community_id and name

    **Returns:**
    - Created tag with all its details

    **Errors:**
    - Returns 400 if tag data violates schema rules
    - Returns 400 if database integrity error occurs (e.g., duplicate tag name)
    """
    policy = TagPolicy(db_session)
    await policy.check_permission(action=ResourceAction.CREATE, user=user, tag_data=tag_data)

    try:
        qb = QueryBuilder(session=db_session, model=CommunityPostTag)
        tag: CommunityPostTag = await qb.add(data=tag_data)
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
        )

    return CommunityTagResponse.model_validate(tag)


@router.get("/tags", response_model=ListCommunityTagResponse)
async def get_tags(
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    community_id: int,
    size: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    db_session: AsyncSession = Depends(get_db_session),
) -> ListCommunityTagResponse:
    """
    Retrieve paginated tags for a specific community.

    **Access Policy:**
    - All authenticated users can read tags

    **Parameters:**
    - `community_id`: ID of the community to get tags for
    - `size`: Number of tags per page (min: 1, max: 100, default: 20)
    - `page`: Page number (min: 1, default: 1)

    **Returns:**
    - tags: List of tags
    - total_pages: Total number of pages available
    """
    policy = TagPolicy(db_session)
    await policy.check_permission(action=ResourceAction.READ, user=user)

    qb = QueryBuilder(session=db_session, model=CommunityPostTag)
    tags: List[CommunityPostTag] = (
        await qb.base()
        .filter(CommunityPostTag.community_id == community_id)
        .paginate(size, page)
        .order(CommunityPostTag.created_at.desc())
        .all()
    )

    count: int = (
        await qb.blank()
        .base(count=True)
        .filter(CommunityPostTag.community_id == community_id)
        .count()
    )
    total_pages: int = response_builder.calculate_pages(count=count, size=size)

    tag_responses = [CommunityTagResponse.model_validate(tag) for tag in tags]
    return ListCommunityTagResponse(tags=tag_responses, total_pages=total_pages)


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    tag: CommunityPostTag = Depends(tag_exists_or_404),
):
    """
    Delete a specific tag.

    **Access Policy:**
    - All authenticated users can delete tags (for now)
    - This can be enhanced later to check for community membership, admin status, etc.

    **Parameters:**
    - `tag_id`: ID of the tag to delete

    **Returns:**
    - 204 No Content on successful deletion

    **Errors:**
    - Returns 404 if tag not found
    """
    policy = TagPolicy(db_session)
    await policy.check_permission(action=ResourceAction.DELETE, user=user, tag=tag)

    qb = QueryBuilder(session=db_session, model=CommunityPostTag)
    await qb.delete(target=tag)
