

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.common.utils import (
    add_meilisearch_data,
    remove_meilisearch_data,
    update_meilisearch_data,
)
from .schemas import ChatRequestSchema
from ...core.database.models.chat import Chat


# async def add_chat(session: AsyncSession,
#                    request: Request,
#                    chat_data: ChatRequestSchema,
#                    user_sub: str,
#                    ) -> str:
#     new_chat = Chat(**chat_data.dict(), user_sub=user_sub)
#     session.add(new_chat)
#     await session.commit()
#     await session.refresh(new_chat)
#     query = (
#         select(Chat)
#         .options(selectinload(Chat.user))
#         .filter(Chat.id == new_chat.id)
#     )
#     result = await session.execute(query)
#     new_chat = result.scalars().first()
#     await add_meilisearch_data(
#         request=request,
#         storage_name="chats",
#         json_values={
#             "id": new_chat.id,
#             "title": new_chat.title,
#         },
#     )
#     return await build_chat_response(new_chat, session, request)
