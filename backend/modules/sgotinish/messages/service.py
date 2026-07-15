from typing import List

from backend.common.utils import response_builder
from backend.core.database.models.sgotinish import (
    Conversation,
    Message,
    MessageReadStatus,
    MessageReadStatusAnon,
    Ticket,
)
from backend.core.database.models.user import User, UserRole
from backend.common.schemas import ShortUserResponse
from backend.modules.sgotinish.delegation.schemas import SGUserResponse
from backend.core.database.models.user import UserRole
from backend.modules.sgotinish.messages import schemas
from backend.modules.sgotinish.messages.policy import MessagePolicy
from backend.modules.sgotinish.tickets.interfaces import AbstractNotificationService
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class MessageService:
    def __init__(
        self,
        db_session: AsyncSession,
        notification_service: AbstractNotificationService,
    ):
        self.db_session = db_session
        self.notification_service = notification_service

    async def _build_message_response(
        self, message: Message, user: tuple[dict, dict]
    ) -> schemas.MessageResponseDTO:
        """Helper to build a message response, applying anonymity rules."""
        # Eager loading in the main query ensures this access is efficient
        ticket = message.conversation.ticket
        ticket_is_anonymous = bool(ticket and ticket.is_anonymous)
        ticket_author_sub = ticket.author_sub if ticket else None
        is_ticket_author_sender = (
            ticket_author_sub is not None and message.sender_sub == ticket_author_sub
        )
        hide_ticket_author_identity = ticket_is_anonymous and is_ticket_author_sender
        dto = schemas.MessageResponseDTO.model_validate(message)

        # (Guardrail) затирает данные если сообщение от SG отправлено через анонимную 
        # Это edge case: анонимный юзер, член SG, создал тикет, отправил сообщение через анонс-ссылку)
        # В принципе, is_from_sg_member больше не ставится при создании сообщения при анонс-ссылке,
        # нижестоящая проверка - sanity check
        if ticket_is_anonymous and message.sender_sub is None and dto.is_from_sg_member:
            dto.is_from_sg_member = False

        if not message.is_from_sg_member and ticket_is_anonymous:
            dto.sender_sub = None

        if hide_ticket_author_identity:
            dto.sender_sub = None

        read_statuses = message.read_statuses
        if ticket_is_anonymous:
            if ticket_author_sub:
                read_statuses = [
                    rs for rs in read_statuses if rs.user_sub != ticket_author_sub
                ]
            else:
                # Never expose anonymous author read statuses.
                read_statuses = list(read_statuses)

        sender_response = None
        if not hide_ticket_author_identity and message.sender:
            if message.sender.role in {UserRole.boss, UserRole.capo, UserRole.soldier, UserRole.admin}:
                sender_response = SGUserResponse(
                    user=ShortUserResponse.model_validate(message.sender),
                    department_name=message.sender.department.name if message.sender.department else "N/A",
                    role=message.sender.role,
                )
            else:
                sender_response = ShortUserResponse.model_validate(message.sender)

        return response_builder.build_schema(
            schemas.MessageResponseDTO,
            dto,
            message_read_statuses=[
                schemas.BaseMessageReadStatus.model_validate(rs) for rs in read_statuses
            ],
            sender=sender_response,
            permissions=MessagePolicy(user).get_permissions(message),
        )

    async def get_messages(
        self, conversation_id: int, size: int, page: int, user: tuple[dict, dict]
    ) -> schemas.ListMessageDTO:
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .options(
                selectinload(Message.conversation).selectinload(Conversation.ticket),
                selectinload(Message.read_statuses),
                selectinload(Message.sender).selectinload(User.department),
            )
            .order_by(Message.sent_at.asc())
            .offset((page - 1) * size)
            .limit(size)
        )
        result = await self.db_session.execute(stmt)
        messages: List[Message] = result.scalars().all()

        count_stmt = (
            select(func.count())
            .select_from(Message)
            .where(Message.conversation_id == conversation_id)
        )
        count_result = await self.db_session.execute(count_stmt)
        count = count_result.scalar_one()

        message_responses = [await self._build_message_response(m, user) for m in messages]
        total_pages = response_builder.calculate_pages(count=count, size=size)
        has_next = page < total_pages
        return schemas.ListMessageDTO(
            items=message_responses,
            total_pages=total_pages,
            total=count,
            page=page,
            size=size,
            has_next=has_next,
        )

    async def get_message_by_id(
        self, message_id: int, user: tuple[dict, dict]
    ) -> schemas.MessageResponseDTO:
        stmt = (
            select(Message)
            .where(Message.id == message_id)
            .options(
                selectinload(Message.conversation).selectinload(Conversation.ticket),
                selectinload(Message.read_statuses),
                selectinload(Message.sender).selectinload(User.department),
            )
        )
        result = await self.db_session.execute(stmt)
        message = result.scalars().first()
        return await self._build_message_response(message, user)

    async def create_message(
        self,
        message_data: schemas.MessageCreateDTO,
        user: tuple[dict, dict],
        conversation: Conversation,
        owner_hash: str | None = None,
    ) -> schemas.MessageResponseDTO:
        user_sub = user[0].get("sub")
        user_role = UserRole(user[1].get("role"))

        sg_roles = [UserRole.boss, UserRole.capo, UserRole.soldier, UserRole.admin]
        is_from_sg = user_role in sg_roles
        is_anonymous_owner = bool(conversation.ticket.is_anonymous and owner_hash)
        # если сообщение отправлено через анонимную ссылку, то не ставим is_from_sg_member флаг
        if is_anonymous_owner:
            is_from_sg = False

        internal_message_data = schemas._InternalMessageCreateDTO(
            **message_data.model_dump(),
            is_from_sg_member=is_from_sg,
            sender_sub=None if is_anonymous_owner else user_sub,
        )

        message = Message(**internal_message_data.model_dump())
        self.db_session.add(message)
        await self.db_session.flush()
        await self.db_session.refresh(message)

        if is_anonymous_owner:
            read_status = MessageReadStatusAnon(message_id=message.id, owner_hash=owner_hash)
            self.db_session.add(read_status)
            await self.db_session.flush()
        else:
            read_status = MessageReadStatus(message_id=message.id, user_sub=user_sub)
            self.db_session.add(read_status)
            await self.db_session.flush()

        # Reload message with all necessary data for notification AND response
        stmt = (
            select(Message)
            .where(Message.id == message.id)
            .options(
                selectinload(Message.read_statuses),
                selectinload(Message.conversation)
                .selectinload(Conversation.ticket)
                .selectinload(Ticket.author),
                selectinload(Message.conversation)
                .selectinload(Conversation.sg_member)
                .selectinload(User.department),
                selectinload(Message.sender).selectinload(User.department),
            )
        )
        result = await self.db_session.execute(stmt)
        full_message = result.scalar_one()

        await self.notification_service.notify_new_message(full_message)

        # Use the fully loaded message for the response as well
        return await self._build_message_response(full_message, user)

    async def mark_message_as_read(
        self,
        message: Message,
        user: tuple[dict, dict],
        owner_hash: str | None = None,
    ) -> schemas.MessageResponseDTO:
        user_sub = user[0].get("sub")
        if message.conversation.ticket.is_anonymous and owner_hash:
            existing_stmt = select(MessageReadStatusAnon).where(
                MessageReadStatusAnon.message_id == message.id,
                MessageReadStatusAnon.owner_hash == owner_hash,
            )
            existing_result = await self.db_session.execute(existing_stmt)
            existing_status = existing_result.scalars().first()
            if not existing_status:
                read_status = MessageReadStatusAnon(message_id=message.id, owner_hash=owner_hash)
                self.db_session.add(read_status)
                await self.db_session.flush()
        else:
            existing_stmt = select(MessageReadStatus).where(
                MessageReadStatus.message_id == message.id,
                MessageReadStatus.user_sub == user_sub,
            )
            existing_result = await self.db_session.execute(existing_stmt)
            existing_status = existing_result.scalars().first()
            if not existing_status:
                read_status = MessageReadStatus(message_id=message.id, user_sub=user_sub)
                self.db_session.add(read_status)
                await self.db_session.flush()

        # Refetch the message with all relations to build the response
        return await self.get_message_by_id(message.id, user)
