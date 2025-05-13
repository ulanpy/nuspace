from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_token, get_db_session
from backend.core.database.models import Message, User
from backend.core.database.models.chat import Chat


async def check_permissions(
    chat_id: int,
    user: Annotated[dict, Depends(check_token)],
    session: AsyncSession = Depends(get_db_session),
) -> bool:
    sub = user.get("sub")
    query = (
        select(User)
        .join(Chat, Chat.sub == User.sub)
        .where(Chat.id == chat_id)
        .limit(1)
    )

    result = await session.execute(query)
    owner = result.scalar_one_or_none()

    if not owner or (owner.sub != sub):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return True




