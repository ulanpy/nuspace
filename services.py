from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func

from backend.common.cruds import QueryBuilder
from backend.common.schemas import ShortUserResponse
from backend.common.utils import response_builder
from backend.core.database.models.sgotinish import (
    Conversation,
    Message,
    Ticket,
    TicketCategory,
)
from backend.modules.sgotinish import cruds, schemas, utils
from sqlalchemy.orm import selectinload


class ConversationService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_conversation_dtos_for_tickets(
        self, tickets: List[Ticket], user: tuple[dict, dict]
    ) -> dict[int, List[schemas.ConversationResponseDTO]]:
        """
        Gathers all conversations from a list of tickets and builds their DTOs efficiently.
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
                schemas.ConversationResponseDTO,
                schemas.ConversationResponseDTO.model_validate(conv),
                sg_member=sg_member,
                messages_count=message_counts_map.get(conv.id, 0),
                permissions=utils.get_conversation_permissions(conv, user),
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
            permissions=utils.get_conversation_permissions(conversation, user),
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
            permissions=utils.get_conversation_permissions(updated_conversation, user),
        )


class TicketService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.conversation_service = ConversationService(db_session)

    async def _build_ticket_response(
        self,
        ticket: Ticket,
        user: tuple[dict, dict],
        unread_counts: dict[int, int] | None = None,
        conversation_dtos_map: dict[int, List[schemas.ConversationResponseDTO]] | None = None,
    ) -> schemas.TicketResponseDTO:
        """
        Helper to build a detailed ticket response DTO from a Ticket ORM object.
        It can accept pre-fetched data for batch operations to avoid N+1 queries.
        """
        # Fetch unread counts if not provided (for single ticket case)
        if unread_counts is None:
            unread_counts = await cruds.get_unread_messages_count_for_tickets(
                db_session=self.db_session, tickets=[ticket], user_sub=user[0].get("sub")
            )

        # Build conversation DTOs if not provided (for single ticket case)
        if conversation_dtos_map is None:
            conversation_dtos_map = (
                await self.conversation_service.get_conversation_dtos_for_tickets(
                    tickets=[ticket], user=user
                )
            )

        # Handle anonymous author
        author = None
        if not ticket.is_anonymous and ticket.author:
            author = ShortUserResponse.model_validate(ticket.author)

        # Build the final ticket response
        ticket_data = schemas.BaseTicket.model_validate(ticket)
        if ticket.is_anonymous:
            ticket_data.author_sub = None

        return response_builder.build_schema(
            schemas.TicketResponseDTO,
            ticket_data,
            author=author,
            unread_count=unread_counts.get(ticket.id, 0),
            conversations=conversation_dtos_map.get(ticket.id, []),
            permissions=utils.get_ticket_permissions(ticket, user),
        )

    async def get_tickets(
        self,
        user: tuple[dict, dict],
        size: int,
        page: int,
        category: TicketCategory | None,
        author_sub: str | None,
        ticket_ids: List[int] | None,
    ) -> schemas.ListTicketDTO:
        filters = []
        if category:
            filters.append(Ticket.category == category)
        if author_sub:
            filters.append(Ticket.author_sub == author_sub)
        if ticket_ids:
            filters.append(Ticket.id.in_(ticket_ids))

        qb = QueryBuilder(session=self.db_session, model=Ticket)

        tickets: List[Ticket] = (
            await qb.base()
            .filter(*filters)
            .eager(Ticket.author)
            .option(selectinload(Ticket.conversations).selectinload(Conversation.sg_member))
            .paginate(size, page)
            .order(Ticket.created_at.desc())
            .all()
        )

        if not tickets:
            return schemas.ListTicketDTO(tickets=[], total_pages=1)

        count: int = await qb.blank(model=Ticket).base(count=True).filter(*filters).count()

        # Batch fetch all required data
        unread_counts = await cruds.get_unread_messages_count_for_tickets(
            db_session=self.db_session, tickets=tickets, user_sub=user[0].get("sub")
        )
        conversation_dtos_map = (
            await self.conversation_service.get_conversation_dtos_for_tickets(
                tickets=tickets, user=user
            )
        )

        # Build responses using the intelligent helper
        ticket_responses = [
            await self._build_ticket_response(
                ticket, user, unread_counts, conversation_dtos_map
            )
            for ticket in tickets
        ]

        total_pages: int = response_builder.calculate_pages(count=count, size=size)
        return schemas.ListTicketDTO(tickets=ticket_responses, total_pages=total_pages)

    async def create_ticket(
        self, ticket_data: schemas.TicketCreateDTO, user: tuple[dict, dict]
    ) -> tuple[Ticket, schemas.TicketResponseDTO]:
        if ticket_data.author_sub == "me":
            ticket_data.author_sub = user[0].get("sub")

        qb = QueryBuilder(session=self.db_session, model=Ticket)
        ticket: Ticket = await qb.add(
            data=ticket_data,
            preload=[Ticket.author],
        )

        response_dto = await self._build_ticket_response(ticket, user)
        return ticket, response_dto

    async def get_ticket_by_id(
        self, ticket_id: int, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO | None:
        qb = QueryBuilder(session=self.db_session, model=Ticket)
        ticket: Ticket | None = await (
            qb.base()
            .filter(Ticket.id == ticket_id)
            .eager(Ticket.author)
            .option(selectinload(Ticket.conversations).selectinload(Conversation.sg_member))
            .first()
        )
        if not ticket:
            return None
        return await self._build_ticket_response(ticket, user)
