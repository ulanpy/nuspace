import logging
from typing import List

from backend.common.schemas import ShortUserResponse
from backend.common.utils import response_builder
from backend.core.database.models.sgotinish import (
    PermissionType,
    Ticket,
    TicketAccess,
    TicketCategory,
)
from backend.core.database.models.user import User, UserRole
from backend.modules.sgotinish.tickets import repository, schemas
from backend.modules.sgotinish.tickets.interfaces import (
    AbstractConversationService,
    AbstractNotificationService,
    AbstractNotionService,
)
from backend.modules.sgotinish.tickets.policy import TicketPolicy
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class TicketService:
    def __init__(
        self,
        db_session: AsyncSession,
        conversation_service: AbstractConversationService,
        notification_service: AbstractNotificationService,
        notion_service: AbstractNotionService | None = None,
    ):
        self.db_session = db_session
        self.repository = repository.TicketRepository(db_session)
        self.conversation_service = conversation_service
        self.notification_service = notification_service
        self.notion_service = notion_service

    async def _build_ticket_response(
        self,
        ticket: Ticket,
        user: tuple[dict, dict],
        unread_counts: dict[int, int] | None = None,
        conversation_dtos_map: dict[int, List[schemas.ConversationResponseDTO]] | None = None,
        access_map: dict[int, list[TicketAccess]] | None = None,
        owner_hash: str | None = None,
        include_access_list: bool = False,
    ) -> schemas.TicketResponseDTO:
        """
        Helper to build a detailed ticket response DTO from a Ticket ORM object.
        It can accept pre-fetched data for batch operations to avoid N+1 queries.
        """
        # === Fetch unread counts if not provided (for single ticket case) ===
        if unread_counts is None:
            if owner_hash:
                unread_counts = await repository.get_unread_messages_count_for_tickets_by_owner_hash(
                    db_session=self.db_session, tickets=[ticket], owner_hash=owner_hash
                )
            else:
                unread_counts = await repository.get_unread_messages_count_for_tickets(
                    db_session=self.db_session, tickets=[ticket], user_sub=user[0].get("sub")
                )

        # === Fetch access rights if not provided (for single ticket case) ===
        if access_map is None:
            access_records = await self.repository.list_ticket_access_for_ticket_and_user(
                ticket_id=ticket.id,
                user_sub=user[0].get("sub"),
            )
            access_map = {ticket.id: access_records}

        # === Build conversation DTOs if not provided (for single ticket case) ===
        if conversation_dtos_map is None:
            conversation_dtos_map = (
                await self.conversation_service.get_conversation_dtos_for_tickets(
                    tickets=[ticket], user=user
                )
            )

        access_list: list[TicketAccess] = []
        policy = TicketPolicy(user)
        if include_access_list and (
            policy.is_admin or (access_map and access_map.get(ticket.id))
        ):
            access_list = await self.repository.list_ticket_accesses_for_ticket(ticket.id)
            # Keep only the highest permission per user.
            permission_rank = {
                PermissionType.VIEW: 1,
                PermissionType.ASSIGN: 2,
                PermissionType.DELEGATE: 3,
            }
            highest_access_by_user: dict[str, TicketAccess] = {}
            for access in access_list:
                existing = highest_access_by_user.get(access.user_sub)
                if not existing:
                    highest_access_by_user[access.user_sub] = access
                    continue
                if permission_rank[access.permission] > permission_rank[existing.permission]:
                    highest_access_by_user[access.user_sub] = access
            access_list = list(highest_access_by_user.values())

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
            permissions=policy.get_permissions(
                ticket, access_map.get(ticket.id)
            ),
            ticket_access=access_map.get(ticket.id)[0].permission if access_map.get(ticket.id) else None,
            access_list=[
                schemas.TicketAccessEntryDTO(
                    user=ShortUserResponse.model_validate(access.user),
                    permission=access.permission,
                    granted_by=ShortUserResponse.model_validate(access.granter)
                    if access.granter
                    else None,
                    granted_at=access.granted_at,
                )
                for access in access_list
            ],
        )

    async def get_tickets(
        self,
        user: tuple[dict, dict],
        size: int,
        page: int,
        category: TicketCategory | None,
        author_sub: str | None,
    ) -> schemas.ListTicketDTO:
        filters = []
        user_sub = user[0].get("sub")
        user_role = UserRole(user[1].get("role"))
        sg_roles = [UserRole.boss, UserRole.capo, UserRole.soldier]

        if author_sub == "me": author_sub = user[0].get("sub")

        # Role-based filtering logic
        if user_role == UserRole.admin:
            # Admins can see all tickets, so no additional filters are needed.
            pass
        elif user_role in sg_roles:
            # SG members can see tickets they've created OR tickets they have access to.
            access_records = await self.repository.list_ticket_access_by_user_sub(user_sub)
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

        if author_sub:
            filters.append(Ticket.author_sub == author_sub)

        # Calculate total count before fetching current page to build pagination metadata
        count = await self.repository.count_tickets(filters)
        total_pages: int = response_builder.calculate_pages(count=count, size=size)
        has_next = page < total_pages

        tickets = await self.repository.list_tickets(filters=filters, size=size, page=page)

        if not tickets:
            return schemas.ListTicketDTO(
                items=[],
                total_pages=total_pages,
                total=count,
                page=page,
                size=size,
                has_next=has_next,
            )

        # Batch fetch all required data
        ticket_ids_list: List[int] = [ticket.id for ticket in tickets]

        unread_counts = await repository.get_unread_messages_count_for_tickets(
            db_session=self.db_session, tickets=tickets, user_sub=user_sub
        )
        conversation_dtos_map: dict[int, List[schemas.ConversationResponseDTO]] = (
            await self.conversation_service.get_conversation_dtos_for_tickets(
                tickets=tickets, user=user
            )
        )
        access_records = await self.repository.list_ticket_accesses_for_tickets_and_user(
            ticket_ids=ticket_ids_list,
            user_sub=user_sub,
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

        return schemas.ListTicketDTO(
            items=ticket_responses,
            total_pages=total_pages,
            total=count,
            page=page,
            size=size,
            has_next=has_next,
        )

    async def create_ticket(
        self, ticket_data: schemas.TicketCreateDTO, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO:
        user_sub = user[0].get("sub")

        if ticket_data.is_anonymous:
            ticket_data.author_sub = None
        else:
            # The author_sub should always be the authenticated user.
            if ticket_data.author_sub == "me":
                ticket_data.author_sub = user_sub
            # Ensure author_sub is set, even if client sends something else for non-admins
            # (Policy layer should prevent this, but as a safeguard)
            if ticket_data.author_sub != user_sub and not TicketPolicy(user).is_admin:
                ticket_data.author_sub = user_sub
            ticket_data.owner_hash = None

        ticket = await self.repository.create_ticket(ticket_data)

        # Grant initial access to all bosses and notify them
        bosses = await self.repository.list_bosses()
        if bosses:
            access_records: List[TicketAccess] = [
                TicketAccess(
                    ticket_id=ticket.id,
                    user_sub=boss.sub,
                    permission=PermissionType.DELEGATE,
                )
                for boss in bosses
            ]
            await self.repository.add_ticket_accesses(access_records)
            # Delegate notification to the NotificationService
            await self.notification_service.notify_new_ticket_to_bosses(
                ticket, bosses
            )

        response_dto = await self._build_ticket_response(ticket, user)
        return response_dto

    async def create_ticket_authorized(
        self, ticket_data: schemas.TicketCreateDTO, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO:
        await self.get_user_for_ticket_creation_or_404(ticket_data, user)
        TicketPolicy(user).check_create(ticket_data)
        return await self.create_ticket(ticket_data=ticket_data, user=user)

    async def update_ticket(
        self, ticket: Ticket, ticket_data: schemas.TicketUpdateDTO, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO:
        ticket = await self.repository.update_ticket(ticket, ticket_data)
        # Reload the ticket with all necessary relationships
        ticket = await self.repository.get_ticket_by_id(ticket.id)

        await self.notification_service.notify_ticket_updated(ticket)
        
        try:
            await self.notion_service.update_notion(ticket)
        except Exception:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Failed to enqueue Notion update for ticket %s", ticket.id)
    
        return await self._build_ticket_response(ticket, user)

    async def get_ticket_by_id(
        self, ticket_id: int, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO | None:
        ticket = await self.repository.get_ticket_by_id(ticket_id)
        if not ticket:
            return None
        return await self._build_ticket_response(ticket, user, include_access_list=True)

    async def get_ticket_by_id_authorized(
        self, ticket_id: int, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO:
        ticket = await self.get_ticket_entity_or_404(ticket_id)
        access = await self.get_user_ticket_access(ticket, user)
        TicketPolicy(user).check_read_one(ticket=ticket, access=access)
        return await self._build_ticket_response(ticket, user, include_access_list=True)

    async def get_ticket_by_owner_hash(
        self, owner_hash: str, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO | None:
        ticket = await self.repository.get_ticket_by_owner_hash(owner_hash)
        if not ticket:
            return None
        return await self._build_ticket_response(
            ticket, user, owner_hash=owner_hash, include_access_list=True
        )

    async def get_ticket_by_owner_hash_or_404(
        self, owner_hash: str, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO:
        ticket = await self.get_ticket_by_owner_hash(owner_hash, user)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        return ticket

    async def get_ticket_entity_or_404(self, ticket_id: int) -> Ticket:
        ticket = await self.repository.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        return ticket

    async def get_user_entity_or_404(
        self, user_sub: str, detail: str = "User not found"
    ) -> User:
        user = await self.repository.get_user_by_sub(user_sub)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
        return user

    async def get_user_for_ticket_creation_or_404(
        self, ticket_data: schemas.TicketCreateDTO, user: tuple[dict, dict]
    ) -> User:
        if ticket_data.is_anonymous or ticket_data.author_sub == "me":
            target_sub = user[0]["sub"]
        else:
            target_sub = ticket_data.author_sub
        return await self.get_user_entity_or_404(target_sub, detail="User not found")

    async def get_tickets_authorized(
        self,
        user: tuple[dict, dict],
        size: int,
        page: int,
        category: TicketCategory | None,
        author_sub: str | None,
    ) -> schemas.ListTicketDTO:
        TicketPolicy(user).check_read_list(author_sub=author_sub)
        return await self.get_tickets(
            user=user,
            size=size,
            page=page,
            category=category,
            author_sub=author_sub,
        )

    async def update_ticket_authorized(
        self,
        ticket_id: int,
        ticket_data: schemas.TicketUpdateDTO,
        user: tuple[dict, dict],
    ) -> schemas.TicketResponseDTO:
        ticket = await self.get_ticket_entity_or_404(ticket_id)
        access = await self.get_user_ticket_access(ticket, user)
        TicketPolicy(user).check_update(ticket, access)
        return await self.update_ticket(ticket=ticket, ticket_data=ticket_data, user=user)


    async def get_user_ticket_access(
        self, ticket: Ticket, user_tuple: tuple[dict, dict]
    ) -> TicketAccess | None:
        """Gets a user's specific access record for a given ticket."""
        user_sub = user_tuple[0].get("sub")
        if not user_sub:
            return None

        return await self.repository.get_ticket_access_for_ticket_and_user(ticket.id, user_sub)
