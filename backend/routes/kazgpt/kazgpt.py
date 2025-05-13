from typing import Annotated, List

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_token, get_db_session
from backend.core.database.models.chat import Message, SenderType, ModelType
from backend.routes.kazgpt import api, cruds
from backend.routes.kazgpt.dependencies import check_permissions
from backend.routes.kazgpt.schemas import MessageRequest, MessageResponse, ChatRequest
from backend.routes.kazgpt.utils import format_history

router = APIRouter(prefix="/chat", tags=["KazGPT"] )


@router.post("/create", status_code=201)
async def create_chat(request: Request,
                      chat_data: ChatRequest,
                      user: Annotated[dict, Depends(check_token)],
                      db_session: AsyncSession = Depends(get_db_session)):
    try:
        newChat = await cruds.add_chat(session=db_session, chat_data=chat_data, user_id=user.get("sub"))
        return newChat
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error{e}")


@router.get("/my_chat", status_code=200)
async def get_my_chats(request: Request, user: Annotated[dict, Depends(check_token)],
                       db_session: AsyncSession = Depends(get_db_session)):
    try:
        chats = await cruds.get_user_chats(session=db_session, user_id=user.get("sub"))
        return chats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.delete("/delete/{chat_id}", status_code=204)
async def delete_chat(request: Request,
                      chat_id: int,
                      user: Annotated[dict, Depends(check_token)],
                      permissions: Annotated[bool, Depends(check_permissions)],
                      db_session: AsyncSession = Depends(get_db_session)):
    try:
        await cruds.delete_chat(session=db_session, chat_id=chat_id)
    except HTTPException as ChatNotFound:
        raise ChatNotFound
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.get("/{chat_id}/messages")
async def get_chat(
        request: Request,
        chat_id: int,
        user: Annotated[dict, Depends(check_token)],
        permissions: Annotated[bool, Depends(check_permissions)],
        db_session: AsyncSession = Depends(get_db_session),
):
    try:
        history: List[Message] = await cruds.get_history(
            session=db_session, chat_id=chat_id, limit=False
        )
        return [MessageResponse.from_orm(message) for message in history]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


# router.post("/message/send/file", status_code=200)
# async def send_file(file: UploadFile)

@router.post("/send", status_code=200)
async def crete_message(request: Request,
                        message_data: MessageRequest,
                        user: Annotated[dict, Depends(check_token)],
                        db_session: AsyncSession = Depends(get_db_session)):
    try:
        chat_data = await cruds.add_message_to_chat(session=db_session, message_data=message_data)

        history: List[Message] = await cruds.get_history(
            session=db_session, chat_id=message_data.chat_id
        )
        formatted_history = format_history(history)
        gpt_answer = await api.ask_gpt(
            client=request.app.state.AI_client, model=chat_data.model_type, history=formatted_history
        )
        await cruds.add_message_to_chat(
            session=db_session,
            message_data=MessageRequest(
                chat_id=message_data.chat_id,
                content=gpt_answer,
                sender_type=SenderType.assistant
            ),
        )
        return gpt_answer
    except HTTPException as ChatNotFound:
        raise ChatNotFound
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error{e}")
