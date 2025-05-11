from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_token, get_db_session
from backend.core.database.models import Message


async def check_permissions(
    chat_id: str,
    user: Annotated[dict, Depends(check_token)],
    session: AsyncSession = Depends(get_db_session),
) -> bool:
    sub = user.get("sub")
    result = await session.execute(select(Message.sub).filter_by(chat_id=chat_id))
    owner = result.scalars().first()

    if sub != owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return True
