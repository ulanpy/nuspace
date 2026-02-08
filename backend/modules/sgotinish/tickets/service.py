import logging

from backend.core.database.models.sgotinish import Ticket, TicketAccess, PermissionType
from backend.core.database.models.user import User, UserRole
from backend.common.cruds import QueryBuilder
from backend.core.database.models.sgotinish import Conversation, TicketCategory
from backend.common.schemas import ShortUserResponse
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
    AbstractNotionService,
)
logger = logging.getLogger(__name__)
from backend.core.database.models.sgotinish import Department


class TicketService:
    def __init__(
        self,
        db_session: AsyncSession,
        conversation_service: AbstractConversationService,
        notification_service: AbstractNotificationService,
        notion_service: AbstractNotionService | None = None,
    ):
        self.db_session = db_session
        self.conversation_service = conversation_service
        self.notification_service = notification_service
        self.notion_service = notion_service

    async def get_departments(self) -> List[schemas.DepartmentResponseDTO]:
        """Retrieves all departments from the database."""
        departments = await QueryBuilder(self.db_session, Department).base().all()
        return [schemas.DepartmentResponseDTO.model_validate(dept) for dept in departments]

    async def get_sg_users(self, department_id: int) -> List[schemas.SGUserResponse]:
        """Retrieves all SG users within a specific department."""
        sg_roles = [UserRole.boss, UserRole.capo, UserRole.soldier]
        users = (
            await QueryBuilder(self.db_session, User)
            .base()
            .filter(User.department_id == department_id, User.role.in_(sg_roles))
            .eager(User.department)
            .all()
        )

        return [
            schemas.SGUserResponse(
                user=ShortUserResponse.model_validate(user),
                department_name=user.department.name if user.department else "N/A",
                role=user.role,
            )
            for user in users
        ]

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
                unread_counts = await cruds.get_unread_messages_count_for_tickets_by_owner_hash(
                    db_session=self.db_session, tickets=[ticket], owner_hash=owner_hash
                )
            else:
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

        access_list: list[TicketAccess] = []
        policy = TicketPolicy(user)
        if include_access_list and (
            policy.is_admin or (access_map and access_map.get(ticket.id))
        ):
            access_list = (
                await QueryBuilder(self.db_session, TicketAccess)
                .base()
                .filter(TicketAccess.ticket_id == ticket.id)
                .eager(TicketAccess.user, TicketAccess.granter)
                .all()
            )
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

        if author_sub:
            filters.append(Ticket.author_sub == author_sub)

        qb = QueryBuilder(session=self.db_session, model=Ticket)

        # Calculate total count before fetching current page to build pagination metadata
        count: int = await qb.blank(model=Ticket).base(count=True).filter(*filters).count()
        total_pages: int = response_builder.calculate_pages(count=count, size=size)
        has_next = page < total_pages

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
        ticket: Ticket = await qb.update(
            instance=ticket, 
            update_data=ticket_data, 
            preload=[Ticket.author]
        )
        # Reload the ticket with all necessary relationships
        ticket = await (
            qb.blank(model=Ticket)
            .base()
            .filter(Ticket.id == ticket.id)
            .eager(Ticket.author)
            .option(selectinload(Ticket.conversations).selectinload(Conversation.sg_member))
            .first()
        )

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
        return await self._build_ticket_response(ticket, user, include_access_list=True)

    async def get_ticket_by_owner_hash(
        self, owner_hash: str, user: tuple[dict, dict]
    ) -> schemas.TicketResponseDTO | None:
        qb = QueryBuilder(session=self.db_session, model=Ticket)
        ticket: Ticket | None = await (
            qb.base()
            .filter(Ticket.owner_hash == owner_hash)
            .eager(Ticket.author)
            .option(selectinload(Ticket.conversations).selectinload(Conversation.sg_member))
            .first()
        )
        if not ticket:
            return None
        return await self._build_ticket_response(
            ticket, user, owner_hash=owner_hash, include_access_list=True
        )


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
        await self.notion_service.notify_notion(ticket)
        return new_access

