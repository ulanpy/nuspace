from backend.core.database.models.sgotinish import Conversation, Message
from backend.common.schemas import ShortUserResponse
from backend.common.utils import response_builder
from backend.modules.sgotinish.conversations import schemas
from backend.modules.sgotinish.conversations.policy import ConversationPolicy
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List
from backend.core.database.models.sgotinish import Ticket
from backend.modules.sgotinish.tickets.interfaces import AbstractConversationService
from backend.modules.sgotinish.tickets import schemas as ticket_schemas


class ConversationService(AbstractConversationService):


    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session


    async def get_conversation_dtos_for_tickets(
        self, tickets: List[Ticket], user: tuple[dict, dict]
    ) -> dict[int, List[ticket_schemas.ConversationResponseDTO]]:
        """
        Efficiently fetches and builds conversation DTOs for a given list of tickets.
        """
        all_conversations = [conv for ticket in tickets for conv in ticket.conversations]
        if not all_conversations:
            return {ticket.id: [] for ticket in tickets}

        conversation_ids = [conv.id for conv in all_conversations]
        count_stmt = (
            select(Message.conversation_id, func.count(Message.id))
            .where(Message.conversation_id.in_(conversation_ids))
            .group_by(Message.conversation_id)
        )
        count_result = await self.db_session.execute(count_stmt)
        message_counts_map = dict(count_result.all())

        ticket_to_conv_dtos = {ticket.id: [] for ticket in tickets}
        for conv in all_conversations:
            sg_member = (
                ShortUserResponse.model_validate(conv.sg_member) if conv.sg_member else None
            )
            conv_dto = response_builder.build_schema(
                ticket_schemas.ConversationResponseDTO,
                ticket_schemas.ConversationResponseDTO.model_validate(conv),
                sg_member=sg_member,
                messages_count=message_counts_map.get(conv.id, 0),
                permissions=ConversationPolicy(user).get_permissions(conv),
            )
            ticket_to_conv_dtos[conv.ticket_id].append(conv_dto)

        return ticket_to_conv_dtos


    async def create_conversation(
        self, conversation_data: schemas.ConversationCreateDTO, user: tuple[dict, dict]
    ) -> schemas.ConversationResponseDTO:
    
        user_sub = user[0].get("sub")
        conversation_data = schemas._ConversationCreateDTO(**conversation_data.model_dump(), sg_member_sub=user_sub)
        
        conversation = Conversation(**conversation_data.model_dump())
        self.db_session.add(conversation)
        await self.db_session.flush()

        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation.id)
            .options(
                selectinload(Conversation.ticket),
                selectinload(Conversation.sg_member),
            )
        )
        result = await self.db_session.execute(stmt)
        conversation = result.scalars().one()

        sg_member = (
            ShortUserResponse.model_validate(conversation.sg_member)
            if conversation.sg_member
            else None
        )

        return response_builder.build_schema(
            schemas.ConversationResponseDTO,
            schemas.ConversationResponseDTO.model_validate(conversation),
            sg_member=sg_member,
            messages_count=0,
            permissions=ConversationPolicy(user).get_permissions(conversation),
        )


    async def update_conversation(
        self,
        conversation: Conversation,
        conversation_data: schemas.ConversationUpdateDTO,
        user: tuple[dict, dict],
    ) -> schemas.ConversationResponseDTO:
        for field, value in conversation_data.model_dump(exclude_unset=True).items():
            if hasattr(conversation, field):
                setattr(conversation, field, value)
        await self.db_session.flush()

        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation.id)
            .options(
                selectinload(Conversation.ticket),
                selectinload(Conversation.sg_member),
            )
        )
        result = await self.db_session.execute(stmt)
        updated_conversation = result.scalars().one()

        count_stmt = (
            select(func.count())
            .select_from(Message)
            .where(Message.conversation_id == updated_conversation.id)
        )
        count_result = await self.db_session.execute(count_stmt)
        message_count = count_result.scalar() or 0

        sg_member = (
            ShortUserResponse.model_validate(updated_conversation.sg_member)
            if updated_conversation.sg_member
            else None
        )

        return response_builder.build_schema(
            schemas.ConversationResponseDTO,
            schemas.ConversationResponseDTO.model_validate(updated_conversation),
            sg_member=sg_member,
            messages_count=message_count,
            permissions=ConversationPolicy(user).get_permissions(updated_conversation),
        )
