import logging
from collections import defaultdict
from datetime import datetime
from typing import List

from backend.common.cruds import QueryBuilder
from backend.common.schemas import ShortUserResponse
from backend.common.utils import response_builder
from backend.core.database.models.sgotinish import (
    Conversation,
    Department,
    PermissionType,
    Ticket,
    TicketAccess,
    TicketCategory,
)
from backend.core.database.models.user import User, UserRole
from backend.modules.sgotinish.tickets import cruds, schemas
from backend.modules.sgotinish.tickets.interfaces import (
    AbstractConversationService,
    AbstractNotificationService,
    AbstractNotionService,
)
from backend.modules.sgotinish.tickets.policy import TicketPolicy
from fastapi import HTTPException, status
from sqlalchemy import delete, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)


class TicketService:
    SG_MEMBER_ROLES = {UserRole.boss, UserRole.capo, UserRole.soldier}
    SG_OR_ADMIN_ROLES = {UserRole.admin, UserRole.boss, UserRole.capo, UserRole.soldier}
    PERMISSION_RANK = {
        PermissionType.VIEW: 1,
        PermissionType.ASSIGN: 2,
        PermissionType.DELEGATE: 3,
    }

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

    @staticmethod
    def _current_sub(user: tuple[dict, dict]) -> str:
        sub = user[0].get("sub")
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials were not provided",
            )
        return sub

    @staticmethod
    def _current_role(user: tuple[dict, dict]) -> UserRole:
        role_value = user[1].get("role")
        if not role_value:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials were not provided",
            )
        return UserRole(role_value)

    @staticmethod
    def _is_sg_or_admin_role(role: UserRole) -> bool:
        return role in {UserRole.admin, UserRole.boss, UserRole.capo, UserRole.soldier}

    @staticmethod
    def _to_short_user(user: User | None):
        return ShortUserResponse.model_validate(user) if user else None

    async def _count_bosses(self, exclude_sub: str | None = None) -> int:
        filters = [User.role == UserRole.boss]
        if exclude_sub:
            filters.append(User.sub != exclude_sub)
        count = await (
            QueryBuilder(self.db_session, User)
            .base(count=True)
            .filter(*filters)
            .count()
        )
        return count

    async def _ensure_department_exists(self, department_id: int) -> Department:
        department = await (
            QueryBuilder(self.db_session, Department)
            .base()
            .filter(Department.id == department_id)
            .first()
        )
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )
        return department

    async def _ensure_can_manage_membership(
        self,
        *,
        actor_role: UserRole,
        actor_department_id: int | None,
        target_role: UserRole,
        target_department_id: int,
    ) -> None:
        if actor_role in {UserRole.admin, UserRole.boss}:
            return

        if actor_role == UserRole.capo:
            if target_role != UserRole.soldier:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Capos can assign only the soldier role.",
                )
            if actor_department_id is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account has no department assigned.",
                )
            if target_department_id != actor_department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Capos can assign members only in their own department.",
                )
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage SG members.",
        )

    async def _pick_reassignment_candidate(
        self,
        *,
        removed_sub: str,
        granter_sub: str | None,
        granter_map: dict[str, User],
        fallback_bosses: list[User],
    ) -> User | None:
        if granter_sub and granter_sub != removed_sub:
            granter = granter_map.get(granter_sub)
            if granter and self._is_sg_or_admin_role(granter.role):
                return granter
        return fallback_bosses[0] if fallback_bosses else None

    async def _ensure_candidate_can_handle_ticket(
        self,
        *,
        ticket_id: int,
        candidate: User,
        granted_by_sub: str | None,
    ) -> None:
        existing_rows: list[TicketAccess] = (
            await QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(
                TicketAccess.ticket_id == ticket_id,
                TicketAccess.user_sub == candidate.sub,
            )
            .all()
        )
        if any(row.permission in {PermissionType.ASSIGN, PermissionType.DELEGATE} for row in existing_rows):
            return

        self.db_session.add(
            TicketAccess(
                ticket_id=ticket_id,
                user_sub=candidate.sub,
                permission=PermissionType.DELEGATE if candidate.role == UserRole.boss else PermissionType.ASSIGN,
                granted_by_sub=granted_by_sub,
            )
        )

    async def _reassign_tickets_for_removed_member(
        self,
        *,
        removed_user: User,
        granted_by_sub: str | None,
    ) -> None:
        removed_sub = removed_user.sub
        access_rows: list[TicketAccess] = (
            await QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(TicketAccess.user_sub == removed_sub)
            .all()
        )
        conversations: list[Conversation] = (
            await QueryBuilder(self.db_session, Conversation)
            .base()
            .filter(Conversation.sg_member_sub == removed_sub)
            .all()
        )

        if not access_rows and not conversations:
            return

        granter_subs = {
            row.granted_by_sub
            for row in access_rows
            if row.granted_by_sub and row.granted_by_sub != removed_sub
        }
        granter_map: dict[str, User] = {}
        if granter_subs:
            granters: list[User] = (
                await QueryBuilder(self.db_session, User)
                .base()
                .filter(User.sub.in_(list(granter_subs)))
                .all()
            )
            granter_map = {granter.sub: granter for granter in granters}

        fallback_bosses: list[User] = (
            await QueryBuilder(self.db_session, User)
            .base()
            .filter(User.role == UserRole.boss, User.sub != removed_sub)
            .order(User.sg_assigned_at.asc().nullsfirst(), User.created_at.asc())
            .all()
        )

        access_by_ticket: dict[int, list[TicketAccess]] = defaultdict(list)
        for row in access_rows:
            access_by_ticket[row.ticket_id].append(row)

        conversations_by_ticket: dict[int, list[Conversation]] = defaultdict(list)
        for conversation in conversations:
            conversations_by_ticket[conversation.ticket_id].append(conversation)

        tickets_to_process = set(access_by_ticket.keys()) | set(conversations_by_ticket.keys())
        for ticket_id in tickets_to_process:
            ticket_access_rows = access_by_ticket.get(ticket_id, [])
            best_granter_sub: str | None = None
            best_score: tuple[int, datetime] | None = None

            for row in ticket_access_rows:
                if not row.granted_by_sub or row.granted_by_sub == removed_sub:
                    continue
                score = (
                    self.PERMISSION_RANK.get(row.permission, 0),
                    row.granted_at or datetime.min,
                )
                if best_score is None or score > best_score:
                    best_score = score
                    best_granter_sub = row.granted_by_sub

            candidate = await self._pick_reassignment_candidate(
                removed_sub=removed_sub,
                granter_sub=best_granter_sub,
                granter_map=granter_map,
                fallback_bosses=fallback_bosses,
            )

            if candidate:
                await self._ensure_candidate_can_handle_ticket(
                    ticket_id=ticket_id,
                    candidate=candidate,
                    granted_by_sub=granted_by_sub,
                )
                for conversation in conversations_by_ticket.get(ticket_id, []):
                    conversation.sg_member_sub = candidate.sub
            else:
                for conversation in conversations_by_ticket.get(ticket_id, []):
                    conversation.sg_member_sub = None

        await self.db_session.execute(
            delete(TicketAccess).where(TicketAccess.user_sub == removed_sub)
        )

    async def _build_sg_member_response(self, user: User) -> schemas.SGMemberResponseDTO:
        sg_assigner: User | None = None
        if user.sg_assigned_by_sub:
            sg_assigner = await (
                QueryBuilder(self.db_session, User)
                .base()
                .filter(User.sub == user.sg_assigned_by_sub)
                .first()
            )

        department_dto = (
            schemas.DepartmentResponseDTO.model_validate(user.department)
            if user.department
            else None
        )
        return schemas.SGMemberResponseDTO(
            user=ShortUserResponse.model_validate(user),
            email=user.email,
            role=user.role,
            department=department_dto,
            sg_assigned_at=user.sg_assigned_at,
            sg_assigned_by=self._to_short_user(sg_assigner),
        )

    async def search_users_for_sg(
        self,
        *,
        user: tuple[dict, dict],
        q: str | None,
        limit: int,
    ) -> list[schemas.SGMemberSearchResponseDTO]:
        actor_role = self._current_role(user)
        if actor_role not in {UserRole.admin, UserRole.boss, UserRole.capo}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to manage SG members.",
            )

        qb = QueryBuilder(self.db_session, User)
        filters = []
        query = (q or "").strip()
        if query:
            pattern = f"%{query}%"
            filters.append(
                or_(
                    User.name.ilike(pattern),
                    User.surname.ilike(pattern),
                    User.email.ilike(pattern),
                )
            )

        users: list[User] = (
            await qb.base()
            .filter(*filters)
            .eager(User.department)
            .order(User.name.asc(), User.surname.asc())
            .paginate(size=limit, page=1)
            .all()
        )

        return [
            schemas.SGMemberSearchResponseDTO(
                user=ShortUserResponse.model_validate(member),
                email=member.email,
                role=member.role,
                department=(
                    schemas.DepartmentResponseDTO.model_validate(member.department)
                    if member.department
                    else None
                ),
            )
            for member in users
        ]

    async def list_sg_members(
        self,
        *,
        user: tuple[dict, dict],
    ) -> list[schemas.SGMemberResponseDTO]:
        actor_role = self._current_role(user)
        if actor_role not in self.SG_OR_ADMIN_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view SG members.",
            )

        members: list[User] = (
            await QueryBuilder(self.db_session, User)
            .base()
            .filter(User.role.in_(list(self.SG_MEMBER_ROLES)))
            .eager(User.department)
            .all()
        )
        role_priority = {UserRole.boss: 0, UserRole.capo: 1, UserRole.soldier: 2}
        members.sort(
            key=lambda member: (
                role_priority.get(member.role, 99),
                member.sg_assigned_at or datetime.min,
                member.created_at or datetime.min,
            )
        )

        responses: list[schemas.SGMemberResponseDTO] = []
        for member in members:
            responses.append(await self._build_sg_member_response(member))
        return responses

    async def upsert_sg_member(
        self,
        *,
        user: tuple[dict, dict],
        payload: schemas.SGMemberUpsertPayload,
    ) -> schemas.SGMemberResponseDTO:
        actor_sub = self._current_sub(user)
        actor_role = self._current_role(user)
        actor_department_id = user[1].get("department_id")

        target_user: User | None = (
            await QueryBuilder(self.db_session, User)
            .base()
            .filter(User.sub == payload.target_user_sub)
            .eager(User.department)
            .first()
        )
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user not found",
            )

        if target_user.role == UserRole.admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin users cannot be reassigned through SG management.",
            )

        await self._ensure_department_exists(payload.department_id)
        await self._ensure_can_manage_membership(
            actor_role=actor_role,
            actor_department_id=actor_department_id,
            target_role=payload.role,
            target_department_id=payload.department_id,
        )

        if target_user.role == UserRole.boss and payload.role != UserRole.boss:
            remaining_bosses = await self._count_bosses(exclude_sub=target_user.sub)
            if remaining_bosses <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="At least one boss must remain in the system.",
                )

        previous_role = target_user.role
        target_user.role = payload.role
        target_user.department_id = payload.department_id

        # Preserve assignment order for existing bosses when role does not change.
        role_changed = previous_role != payload.role
        is_new_sg_member = previous_role not in self.SG_MEMBER_ROLES
        if is_new_sg_member or role_changed or target_user.sg_assigned_at is None:
            target_user.sg_assigned_at = datetime.utcnow()
            target_user.sg_assigned_by_sub = actor_sub

        await self.db_session.commit()

        target_user = (
            await QueryBuilder(self.db_session, User)
            .base()
            .filter(User.sub == payload.target_user_sub)
            .eager(User.department)
            .first()
        )
        return await self._build_sg_member_response(target_user)

    async def remove_sg_member(
        self,
        *,
        user: tuple[dict, dict],
        target_user_sub: str,
    ) -> schemas.SGMemberActionResult:
        actor_sub = self._current_sub(user)
        actor_role = self._current_role(user)

        if actor_role not in {UserRole.admin, UserRole.boss, UserRole.capo}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to remove SG members.",
            )
        if target_user_sub == actor_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use self-withdraw to remove your own SG role.",
            )

        actor_user = await (
            QueryBuilder(self.db_session, User)
            .base()
            .filter(User.sub == actor_sub)
            .first()
        )
        if not actor_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Current user not found",
            )

        target_user: User | None = (
            await QueryBuilder(self.db_session, User)
            .base()
            .filter(User.sub == target_user_sub)
            .first()
        )
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user not found",
            )
        if target_user.role not in self.SG_MEMBER_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target user is not an SG member.",
            )
        if actor_role == UserRole.capo and target_user.role == UserRole.boss:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Capos cannot remove bosses.",
            )
        if actor_role == UserRole.boss and target_user.role == UserRole.boss:
            actor_boss_time = actor_user.sg_assigned_at or actor_user.created_at or datetime.min
            target_boss_time = target_user.sg_assigned_at or target_user.created_at or datetime.min
            if actor_boss_time > target_boss_time:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You cannot remove a boss who was assigned before you.",
                )
        if target_user.role == UserRole.boss:
            remaining_bosses = await self._count_bosses(exclude_sub=target_user.sub)
            if remaining_bosses <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="At least one boss must remain in the system.",
                )

        await self._reassign_tickets_for_removed_member(
            removed_user=target_user,
            granted_by_sub=actor_sub,
        )

        target_user.role = UserRole.default
        target_user.department_id = None
        target_user.sg_assigned_at = None
        target_user.sg_assigned_by_sub = None

        await self.db_session.commit()
        return schemas.SGMemberActionResult(detail="SG member removed successfully.")

    async def withdraw_from_sg(
        self,
        *,
        user: tuple[dict, dict],
    ) -> schemas.SGMemberActionResult:
        actor_sub = self._current_sub(user)
        actor_role = self._current_role(user)

        if actor_role not in self.SG_MEMBER_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only SG members can withdraw.",
            )

        actor_user: User | None = (
            await QueryBuilder(self.db_session, User)
            .base()
            .filter(User.sub == actor_sub)
            .first()
        )
        if not actor_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Current user not found",
            )

        if actor_user.role == UserRole.boss:
            remaining_bosses = await self._count_bosses(exclude_sub=actor_user.sub)
            if remaining_bosses <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You are the last boss. Add another boss before withdrawing.",
                )

        await self._reassign_tickets_for_removed_member(
            removed_user=actor_user,
            granted_by_sub=None,
        )

        actor_user.role = UserRole.default
        actor_user.department_id = None
        actor_user.sg_assigned_at = None
        actor_user.sg_assigned_by_sub = None

        await self.db_session.commit()
        return schemas.SGMemberActionResult(detail="You have withdrawn from SG successfully.")

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
