from typing import Dict, Union

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import User
from backend.core.database.models.chat import Message, Chat, SenderType, ModelType
from backend.routes.kazgpt.schemas import MessageRequest, ChatRequest


async def add_chat(session: AsyncSession, chat_data: ChatRequest, user_id: str) -> Chat:
    chat_data: dict = chat_data.dict()
    chat_data.update({"sub": user_id})
    new_chat: Chat = Chat(**chat_data)
    session.add(new_chat)
    await session.commit()
    return new_chat


async def add_message_to_chat(session: AsyncSession, message_data: MessageRequest) -> Chat:
    chat: Chat | None = await session.get(Chat, message_data.chat_id)

    if chat is None:
        raise HTTPException(status_code=404, detail=f"Chat with id: {message_data.chat_id}")

    message_data: dict = message_data.dict()

    new_message: Message = Message(**message_data)
    session.add(new_message)
    await session.commit()

    return chat


async def get_history(session: AsyncSession, chat_id: int, limit: bool = True) -> list[Message]:
    query = select(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at)
    if limit:
        query = query.limit(10)
    result = await session.execute(query)
    return list(result.scalars().all())


async def delete_chat(session: AsyncSession, chat_id: int) -> None:
    result = await session.execute(
        delete(Chat).where(Chat.id == chat_id)
    )
    await session.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"Chat with id {chat_id} not found")


async def get_user_chats(session: AsyncSession, user_id: str) -> list[Chat]:
    result = await session.execute(select(Chat).filter(Chat.sub == user_id))
    return list(result.scalars().all())
