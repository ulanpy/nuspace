from backend.core.database.models.sgotinish import Message, MessageReadStatus
from backend.common.cruds import QueryBuilder
from backend.common.utils import response_builder
from backend.routes.sgotinish.messages import schemas
from backend.routes.sgotinish.messages.policy import MessagePolicy
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from typing import List
from backend.core.database.models.sgotinish import Conversation
from backend.core.database.models.user import UserRole


class MessageService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def _build_message_response(
        self, message: Message, user: tuple[dict, dict]
    ) -> schemas.MessageResponseDTO:
        """Helper to build a message response, applying anonymity rules."""
        # Eager loading in the main query ensures this access is efficient
        ticket_is_anonymous = message.conversation.ticket.is_anonymous
        dto = schemas.MessageResponseDTO.model_validate(message)

        if not message.is_from_sg_member and ticket_is_anonymous:
            dto.sender_sub = None

        return response_builder.build_schema(
            schemas.MessageResponseDTO,
            dto,
            message_read_statuses=[
                schemas.BaseMessageReadStatus.model_validate(rs)
                for rs in message.read_statuses
            ],
            permissions=MessagePolicy(user).get_permissions(message),
        )

    async def get_messages(
        self, conversation_id: int, size: int, page: int, user: tuple[dict, dict]
    ) -> schemas.ListMessageDTO:
        qb = QueryBuilder(session=self.db_session, model=Message)
        messages: List[Message] = (
            await qb.base()
            .filter(Message.conversation_id == conversation_id)
            .option(
                selectinload(Message.conversation).selectinload(Conversation.ticket),
                selectinload(Message.read_statuses),
            )
            .paginate(size, page)
            .order(Message.sent_at.desc())
            .all()
        )
        count = (
            await qb.blank()
            .base(count=True)
            .filter(Message.conversation_id == conversation_id)
            .count()
        )

        message_responses = [await self._build_message_response(m, user) for m in messages]
        total_pages = response_builder.calculate_pages(count=count, size=size)
        return schemas.ListMessageDTO(messages=message_responses, total_pages=total_pages)

    async def get_message_by_id(
        self, message_id: int, user: tuple[dict, dict]
    ) -> schemas.MessageResponseDTO:
        message = await (
            QueryBuilder(self.db_session, Message)
            .base()
            .filter(Message.id == message_id)
            .option(
                selectinload(Message.conversation).selectinload(Conversation.ticket),
                selectinload(Message.read_statuses),
            )
            .first()
        )
        return await self._build_message_response(message, user)

    async def create_message(
        self, message_data: schemas.MessageCreateDTO, user: tuple[dict, dict]
    ) -> schemas.MessageResponseDTO:
        user_sub = user[0].get("sub")
        user_role = UserRole(user[1].get("role"))

        if message_data.sender_sub == "me":
            message_data.sender_sub = user_sub

        sg_roles = [UserRole.boss, UserRole.capo, UserRole.soldier, UserRole.admin]
        is_from_sg = user_role in sg_roles

        internal_message_data = schemas._InternalMessageCreateDTO(
            **message_data.model_dump(),
            is_from_sg_member=is_from_sg,
        )

        qb = QueryBuilder(self.db_session, Message)
        message = await qb.add(data=internal_message_data, preload=[Message.conversation, Message.read_statuses])

        # Automatically mark the message as read for the sender
        await qb.blank(model=MessageReadStatus).add(
            schemas.MessageReadStatusCreateDTO(
                message_id=message.id, user_sub=user_sub
            )
        )

        # Refetch the message with all relations to build the response
        return await self._build_message_response(message, user)

    async def mark_message_as_read(
        self, message: Message, user: tuple[dict, dict]
    ) -> schemas.MessageResponseDTO:
        user_sub = user[0].get("sub")
        qb = QueryBuilder(self.db_session, MessageReadStatus)

        # Check if already marked as read to avoid duplicates
        existing_status = await (
            qb.base()
            .filter(
                MessageReadStatus.message_id == message.id,
                MessageReadStatus.user_sub == user_sub,
            )
            .first()
        )

        if not existing_status:
            await qb.add(
                schemas.MessageReadStatusCreateDTO(message_id=message.id, user_sub=user_sub)
            )

        # Refetch the message with all relations to build the response
        return await self.get_message_by_id(message.id, user)

