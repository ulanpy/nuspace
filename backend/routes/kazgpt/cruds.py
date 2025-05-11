from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.chat import Message
from backend.routes.kazgpt.schemas import MessageRequest


async def add_message(session: AsyncSession, message_data: MessageRequest) -> Message:
    total_query = select(func.count(Message.id)).filter_by(chat_id=message_data.chat_id)
    total_result = await session.execute(total_query)
    total_count: int = total_result.scalar()

    message_data: dict = message_data.dict()
    message_data.update({"message_order": total_count + 1})

    new_message: Message = Message(**message_data)
    session.add(new_message)
    await session.commit()
    return new_message


async def get_history(session: AsyncSession, chat_id: str, limit: bool = True) -> list[Message]:
    query = select(Message).filter(Message.chat_id == chat_id).order_by(Message.message_order)
    if limit:
        query = query.limit(10)
    result = await session.execute(query)
    return list(result.scalars().all())
