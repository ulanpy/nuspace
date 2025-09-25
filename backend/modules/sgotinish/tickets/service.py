from backend.core.database.models.sgotinish import Ticket, TicketAccess, PermissionType
from backend.core.database.models.user import User, UserRole
from backend.common.cruds import QueryBuilder
from backend.core.database.models.sgotinish import Conversation, TicketCategory
from backend.common.schemas import ShortUserResponse, Infra
from backend.common.utils import response_builder
from backend.modules.sgotinish.tickets import schemas
from backend.modules.sgotinish.tickets.policy import TicketPolicy
from sqlalchemy.ext.asyncio import AsyncSession
from backend.modules.sgotinish.tickets import cruds
from sqlalchemy.orm import selectinload
from sqlalchemy import or_
from typing import List
from backend.modules.sgotinish.tickets.interfaces import (
    AbstractConversationService,
    AbstractNotificationService,
)


class TicketService:
    def __init__(
        self,
        db_session: AsyncSession,
        conversation_service: AbstractConversationService,
        notification_service: AbstractNotificationService,
    ):
        self.db_session = db_session
        self.conversation_service = conversation_service
        self.notification_service = notification_service

    async def _build_ticket_response(
        self,
        ticket: Ticket,
        user: tuple[dict, dict],
        unread_counts: dict[int, int] | None = None,
        conversation_dtos_map: dict[int, List[schemas.ConversationResponseDTO]] | None = None,
        access_map: dict[int, list[TicketAccess]] | None = None,
    ) -> schemas.TicketResponseDTO:
        """
        Helper to build a detailed ticket response DTO from a Ticket ORM object.
        It can accept pre-fetched data for batch operations to avoid N+1 queries.
        """
        # === Fetch unread counts if not provided (for single ticket case) ===
        if unread_counts is None:
            unread_counts = await cruds.get_unread_messages_count_for_tickets(
                db_session=self.db_session, tickets=[ticket], user_sub=user[0].get("sub")
            )

        # === Fetch access rights if not provided (for single ticket case) ===
        if access_map is None:
            access_records = (
                await QueryBuilder(self.db_session, TicketAccess)
                .base()
                .filter(
                    TicketAccess.ticket_id == ticket.id,
                    TicketAccess.user_sub == user[0].get("sub"),
                )
                .all()
            )
            access_map = {ticket.id: access_records}

        # === Build conversation DTOs if not provided (for single ticket case) ===
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
            permissions=TicketPolicy(user).get_permissions(
                ticket, access_map.get(ticket.id)
            ),
        )

    async def get_tickets(
        self,
        user: tuple[dict, dict],
        size: int,
        page: int,
        category: TicketCategory | None,
    ) -> schemas.ListTicketDTO:
        filters = []
        user_sub = user[0].get("sub")
        user_role = UserRole(user[1].get("role"))
        sg_roles = [UserRole.boss, UserRole.capo, UserRole.soldier]

        # Role-based filtering logic
        if user_role == UserRole.admin:
            # Admins can see all tickets, so no additional filters are needed.
            pass
        elif user_role in sg_roles:
            # SG members can see tickets they've created OR tickets they have access to.
            access_records: List[TicketAccess] = (
                await QueryBuilder(self.db_session, TicketAccess)
                .base()
                .filter(TicketAccess.user_sub == user_sub)
                .all()
            )
            accessible_ticket_ids: List[int] = [record.ticket_id for record in access_records]

            author_filter = Ticket.author_sub == user_sub
            if accessible_ticket_ids:
                access_filter = Ticket.id.in_(accessible_ticket_ids)
                filters.append(or_(author_filter, access_filter))
            else:
                filters.append(author_filter)
        else:
            # Regular users can only see tickets they have created.
            filters.append(Ticket.author_sub == user_sub)

        if category:
            filters.append(Ticket.category == category)

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
        ticket_ids_list: List[int] = [ticket.id for ticket in tickets]

        unread_counts = await cruds.get_unread_messages_count_for_tickets(
            db_session=self.db_session, tickets=tickets, user_sub=user_sub
        )
        conversation_dtos_map: dict[int, List[schemas.ConversationResponseDTO]] = (
            await self.conversation_service.get_conversation_dtos_for_tickets(
                tickets=tickets, user=user
            )
        )
        access_records: List[TicketAccess] = (
            await QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(
                TicketAccess.ticket_id.in_(ticket_ids_list),
                TicketAccess.user_sub == user_sub,
            )
            .all()
        )
        access_map: dict[int, List[TicketAccess]] = {ticket_id: [] for ticket_id in ticket_ids_list}
        for access in access_records:
            access_map[access.ticket_id].append(access)

        # Build responses using the intelligent helper
        ticket_responses: List[schemas.TicketResponseDTO] = [
            await self._build_ticket_response(
                ticket, user, unread_counts, conversation_dtos_map, access_map
            )
            for ticket in tickets
        ]

        total_pages: int = response_builder.calculate_pages(count=count, size=size)
        return schemas.ListTicketDTO(tickets=ticket_responses, total_pages=total_pages)

    async def create_ticket(
        self, ticket_data: schemas.TicketCreateDTO, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO:
        user_sub = user[0].get("sub")

        # The author_sub should always be the authenticated user.
        # Anonymity is handled at the presentation layer.
        if ticket_data.author_sub == "me":
            ticket_data.author_sub = user_sub
        # Ensure author_sub is set, even if client sends something else for non-admins
        # (Policy layer should prevent this, but as a safeguard)
        if ticket_data.author_sub != user_sub and not TicketPolicy(user).is_admin:
             ticket_data.author_sub = user_sub

        qb = QueryBuilder(session=self.db_session, model=Ticket)
        ticket: Ticket = await qb.add(
            data=ticket_data,
            preload=[Ticket.author, Ticket.conversations],
        )

        # Grant initial access to all bosses and notify them
        bosses: List[User] = (
            await qb.blank(model=User).base().filter(User.role == UserRole.boss).all()
        )
        if bosses:
            access_qb = QueryBuilder(self.db_session, TicketAccess)
            access_records: List[TicketAccess] = [
                TicketAccess(
                    ticket_id=ticket.id,
                    user_sub=boss.sub,
                    permission=PermissionType.DELEGATE,
                )
                for boss in bosses
            ]
            await access_qb.add_orm_list(access_records)
            # Delegate notification to the NotificationService
            await self.notification_service.notify_new_ticket_to_bosses(
                ticket, bosses
            )

        response_dto = await self._build_ticket_response(ticket, user)
        return response_dto

    async def update_ticket(
        self, ticket: Ticket, ticket_data: schemas.TicketUpdateDTO, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO:
        qb = QueryBuilder(session=self.db_session, model=Ticket)
        ticket: Ticket = await qb.update(instance=ticket, update_data=ticket_data)
        return await self._build_ticket_response(ticket, user)

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

    async def get_user_ticket_access(
        self, ticket: Ticket, user_tuple: tuple[dict, dict]
    ) -> TicketAccess | None:
        """Gets a user's specific access record for a given ticket."""
        user_sub = user_tuple[0].get("sub")
        if not user_sub:
            return None

        return await (
            QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(
                TicketAccess.ticket_id == ticket.id,
                TicketAccess.user_sub == user_sub,
            )
            .first()
        )

    async def delegate_access(
        self,
        ticket: Ticket,
        granter_sub: str,
        grantee_sub: str,
        permission: PermissionType,
    ) -> TicketAccess:
        """Grants a user a specific permission for a ticket."""
        access_qb = QueryBuilder(self.db_session, TicketAccess)
        
        # Check if the same permission already exists
        existing_access: TicketAccess | None = await access_qb.base().filter(
            TicketAccess.ticket_id == ticket.id,
            TicketAccess.user_sub == grantee_sub,
            TicketAccess.permission == permission,
        ).first()

        if existing_access:
            return existing_access

        new_access = TicketAccess(
            ticket_id=ticket.id,
            user_sub=grantee_sub,
            permission=permission,
            granted_by_sub=granter_sub,
        )
        
        await access_qb.add_orm_list([new_access], [TicketAccess.user, TicketAccess.granter])
        await self.notification_service.notify_ticket_access_granted(ticket, new_access)
        return new_access

