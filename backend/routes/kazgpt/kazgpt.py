
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_token, get_db_session
from .schemas import ChatResponseSchema

from ...common.utils import add_meilisearch_data, search_for_meilisearch_data
from ...core.database.models.club import ClubType, EventPolicy

router = APIRouter(tags=["KazGPT"])


# @router.post("/chat/new", response_model=ChatResponseSchema)
# async def add_chat(
#     request: Request,
#     club: ClubRequestSchema,
#     user: Annotated[dict, Depends(check_token)],
#     db_session: AsyncSession = Depends(get_db_session),
# ) -> ClubResponseSchema:
#     try:
#         return await add_new_club(request, club, db_session)
#     except IntegrityError:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="db rejected the request: probably there are duplication issues",
#         )
# @router.post("/chat/send", response_model=ClubResponseSchema)
# async def send(
#     request: Request,
#     club: ClubRequestSchema,
#     user: Annotated[dict, Depends(check_token)],
#     db_session: AsyncSession = Depends(get_db_session),
# ) -> ClubResponseSchema:
#     try:
#         return await add_new_club(request, club, db_session)
#     except IntegrityError:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="db rejected the request: probably there are duplication issues",
#         )
#
# @router.get("/chat/history/{user_id}", response_model=ClubResponseSchema)
# async def get_user_history(
#     request: Request,
#     club: ClubRequestSchema,
#     user: Annotated[dict, Depends(check_token)],
#     db_session: AsyncSession = Depends(get_db_session),
# ) -> ClubResponseSchema:
#     try:
#         return await add_new_club(request, club, db_session)
#     except IntegrityError:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="db rejected the request: probably there are duplication issues",
#         )
#
# @router.get("/chat/{chat_id}", response_model=ClubResponseSchema)
# async def get_chat(
#     request: Request,
#     club: ClubRequestSchema,
#     user: Annotated[dict, Depends(check_token)],
#     db_session: AsyncSession = Depends(get_db_session),
# ) -> ClubResponseSchema:
#     try:
#         return await add_new_club(request, club, db_session)
#     except IntegrityError:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="db rejected the request: probably there are duplication issues",
#         )
#
# @router.delete("/chat/{chat_id}", response_model=ClubResponseSchema)
# async def delete_chat(
#     request: Request,
#     club: ClubRequestSchema,
#     user: Annotated[dict, Depends(check_token)],
#     db_session: AsyncSession = Depends(get_db_session),
# ) -> ClubResponseSchema:
#     try:
#         return await add_new_club(request, club, db_session)
#     except IntegrityError:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="db rejected the request: probably there are duplication issues",
#         )