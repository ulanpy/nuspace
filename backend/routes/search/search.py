from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from httpx import HTTPError

from backend.common.dependencies import check_token
from backend.common.utils import meilisearch
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.product import ProductStatus

router = APIRouter(tags=["Search Routes"])


# @router.get("/products/search/", response_model=ListResponseSchema)
# async def search(
#     request: Request,
#     user: Annotated[dict, Depends(check_token)],
#     keyword: str,
#     condition: ProductCondition = None,
#     size: int = 20,
#     page: int = 1,
#     db_session=Depends(get_db_session),
# ):
#     """
#     Retrieves product objects from database based on the
#     search result of pre_search router.
#     - The returned products contain details such as id, name,
#     description, price, condition, and category.

#     **Parameters:**
#     - `keyword`: word for searching products
#     - `size`: Number of products per page (default: 20)
#     - `page`: Page number (default: 1)

#     **Returns:**
#     - A list of product objects that match the keyword from the search.
#     - Products will be returned with their full details (from the database).
#     """

#     filters = [f"condition = {condition.value}"] if condition else None

#     search_results: dict = await meilisearch.get(
#         keyword=keyword,
#         request=request,
#         page=page,
#         size=size,
#         filters=filters,
#         storage_name="products",
#     )
#     product_ids = [product["id"] for product in search_results["hits"]]
#     return await cruds.get_products_for_search(
#         size=size,
#         request=request,
#         session=db_session,
#         product_ids=product_ids,
#         num_of_products=search_results["estimatedTotalHits"],
#     )


# @router.get("/events/search/", response_model=ListEventSchema)
# async def post_search(
#     request: Request,
#     keyword: str,
#     user: Annotated[dict, Depends(check_token)],
#     size: int = 20,
#     page: int = 1,
#     db_session=Depends(get_db_session),
# ) -> ListEventSchema:
#     """
#     Search events using Meilisearch.

#     Parameters:
#     - `keyword` (str): Search term.
#     - `size` (int): Items per page (default: 20).
#     - `page` (int): Page number (default: 1).

#     Returns:
#     - `ListEventSchema`: Matching events and total pages.
#     """
#     search_results = await get(
#         keyword=keyword, request=request, page=page, size=size, storage_name="events"
#     )
#     event_ids: List[int] = [event["id"] for event in search_results["hits"]]

#     events: List[ClubEvent] = await cruds.get_certain_events(
#         session=db_session, event_ids=event_ids
#     )

#     event_responses: List[ClubEventResponseSchema] = await response_builder.build_responses(
#         request=request,
#         items=events,
#         get_media=cruds.get_media_responses,
#         session=db_session,
#         media_format=MediaFormat.carousel,
#         entity_type=EntityType.club_events,
#         response_builder=response_builder.build_resource_response,
#     )

#     count: int = search_results["estimatedTotalHits"]
#     num_of_pages: int = response_builder.calculate_pages(count=count, size=size)
#     return ListEventSchema(events=event_responses, num_of_pages=num_of_pages)


@router.get("/pre_search/", response_model=list[str])
async def pre_search(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    keyword: str,
    storage_name: EntityType,
):
    """
    Searches for entities based on the provided keyword:
    - Uses Meilisearch to find matching entities.
    - Will return active entities only that match the keyword.
    - For products, only returns active products (status = active).
    - The search results are then used to fetch entity details from the database.
    - The returned entities contain details such as id, name, description, etc.
    - Returns an empty list if the index doesn't exist or if there are no matches.

    **Parameters:**
    - `keyword`: The search term used to find entities.
    It will be used for querying in Meilisearch.
    - `storage_name`: The type of entity to search for (products, clubs, club_events).
    Must be a valid EntityType.

    **Returns:**
    - A list of entity names that match the keyword from the search.
    - Returns an empty list if the index doesn't exist or no matches found.
    """
    distinct_keywords = []
    seen = set()
    page = 1

    try:
        while len(distinct_keywords) < 5:
            try:
                # Add filter for active products if storage_name is products
                filters = (
                    [f"status = {ProductStatus.active.value}"]
                    if storage_name == EntityType.products
                    else None
                )

                result = await meilisearch.get(
                    request=request,
                    storage_name=storage_name.value,
                    keyword=keyword,
                    page=page,
                    size=20,
                    filters=filters,
                )

                # If result doesn't contain hits, the index might not exist
                if "hits" not in result:
                    return []

                for object in result["hits"]:
                    if object["name"] not in seen:
                        seen.add(object["name"])
                        distinct_keywords.append(object["name"])
                    if len(distinct_keywords) >= 5:
                        break
                else:
                    break
                page += 1
            except HTTPError as e:
                # Handle HTTP errors from Meilisearch (like index not found)
                if e.response and e.response.status_code == 404:
                    return []
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error searching Meilisearch: {str(e)}",
                )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during search: {str(e)}",
        )

    return distinct_keywords
