from backend.core.database.models.sgotinish import Conversation, Message
from backend.common.schemas import ShortUserResponse
from backend.common.cruds import QueryBuilder
from backend.common.utils import response_builder
from backend.modules.sgotinish.conversations import schemas
from backend.modules.sgotinish.conversations.policy import ConversationPolicy
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from backend.core.database.models.sgotinish import Ticket
from sqlalchemy import func
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

        # Batch fetch message counts for all conversations
        conversation_ids = [conv.id for conv in all_conversations]
        message_counts_result = await (
            QueryBuilder(self.db_session, Message)
            .base()
            .attributes(Message.conversation_id, func.count(Message.id))
            .filter(Message.conversation_id.in_(conversation_ids))
            .group_by(Message.conversation_id)
            .all()
        )
        message_counts_map = dict(message_counts_result)

        # Build DTOs and map them back to ticket IDs
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
        if conversation_data.sg_member_sub == "me":
            conversation_data.sg_member_sub = user[0].get("sub")

        qb = QueryBuilder(session=self.db_session, model=Conversation)
        conversation: Conversation = await qb.add(
            data=conversation_data,
            preload=[Conversation.ticket, Conversation.sg_member],
        )

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
        qb = QueryBuilder(session=self.db_session, model=Conversation)
        updated_conversation: Conversation = await qb.update(
            instance=conversation,
            update_data=conversation_data,
            preload=[Conversation.ticket, Conversation.sg_member],
        )

        message_count = await qb.blank(model=Message).base(count=True).filter(
            Message.conversation_id == updated_conversation.id
        ).count()

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
