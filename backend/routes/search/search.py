# from typing import Annotated

# from fastapi import APIRouter, Depends, Request

# from backend.common.dependencies import get_db_session
# from backend.common.utils import meilisearch
# from backend.routes.auth.utils import check_token

# router = APIRouter(prefix="/search", tags=["search"])


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

#     search_results = await meilisearch.get(
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


# @router.get("/products/pre_search/", response_model=list[str])
# async def pre_search(
#     request: Request,
#     user: Annotated[dict, Depends(check_token)],
#     keyword: str,
#     db_session=Depends(get_db_session),
# ):
#     """
#     Searches for products based on the provided keyword:
#     - Uses Meilisearch to find matching products.
#     - Will return active products only that match the keyword.
#     - The search results are then used to fetch product details from the database.
#     - The returned products contain details such as id, name,
#     description, price, condition, and category.

#     **Parameters:**
#     - `keyword`: The search term used to find products.
#     It will be used for querying in Meilisearch.

#     **Returns:**
#     - A list of product objects that match the keyword from the search.
#     """
#     distinct_keywords = []
#     seen = set()
#     page = 1
#     while len(distinct_keywords) < 5:
#         result = await meilisearch.get(
#             request=request,
#             storage_name="products",
#             keyword=keyword,
#             page=page,
#             size=20,
#         )
#         for object in result["hits"]:
#             if object["name"] not in seen:
#                 seen.add(object["name"])
#                 distinct_keywords.append(object["name"])
#             if len(distinct_keywords) >= 5:
#                 break
#         else:
#             break
#         page += 1
#     return distinct_keywords


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


# @router.get("/events/pre_search/", response_model=List[str])
# async def pre_search(
#     request: Request, keyword: str, user: Annotated[dict, Depends(check_token)]
# ) -> List[str]:
#     """
#     Get search suggestions for events.

#     Parameters:
#     - `keyword` (str): Partial search term.

#     Returns:
#     - `List[str]`: Top 5 matching event names.
#     """
#     return await response_builder.pre_search(
#         request=request, keyword=keyword, storage_name="events"
#     )
