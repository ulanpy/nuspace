from typing import Annotated, List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_token, get_db_session
from backend.core.database.models.chat import Message, SenderType
from backend.routes.kazgpt import api, cruds
from backend.routes.kazgpt.dependencies import check_permissions
from backend.routes.kazgpt.schemas import MessageRequest, MessageResponse
from backend.routes.kazgpt.utils import format_history

router = APIRouter(tags=["KazGPT"])


@router.get("/chat/{chat_id}")
async def get_chat(
    request: Request,
    chat_id: str,
    user: Annotated[dict, Depends(check_token)],
    permissions: Annotated[bool, Depends(check_permissions)],
    db_session: AsyncSession = Depends(get_db_session),
):
    history: List[Message] = await cruds.get_history(
        session=db_session, chat_id=chat_id, limit=False
    )
    return [MessageResponse.from_orm(message) for message in history]


@router.post("/chat")
async def send_message(
    request: Request,
    message_data: MessageRequest,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
):
    await cruds.add_message(session=db_session, message_data=message_data)
    history: List[Message] = await cruds.get_history(
        session=db_session, chat_id=message_data.chat_id
    )
    formatted_history = format_history(history)
    gpt_answer = await api.ask_gpt(
        client=request.app.state.AI_client, model=message_data.model_type, history=formatted_history
    )
    await cruds.add_message(
        session=db_session,
        message_data=MessageRequest(
            chat_id=message_data.chat_id,
            sub=message_data.sub,
            message=gpt_answer,
            sender_type=SenderType.assistant,
            model_type=message_data.model_type,
        ),
    )
    return gpt_answer
