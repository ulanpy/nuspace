from collections import defaultdict
from datetime import datetime
from typing import List

from backend.common.schemas import ShortUserResponse
from backend.core.database.models.sgotinish import (
    Conversation,
    Department,
    PermissionType,
    Ticket,
    TicketAccess,
)
from backend.core.database.models.user import User, UserRole
from backend.modules.sgotinish.delegation import repository, schemas
from backend.modules.sgotinish.tickets.interfaces import (
    AbstractNotificationService,
    AbstractNotionService,
)
from backend.modules.sgotinish.tickets.policy import TicketPolicy
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession


class DelegationService:
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
        notification_service: AbstractNotificationService,
        notion_service: AbstractNotionService | None = None,
    ):
        self.db_session = db_session
        self.repository = repository.DelegationRepository(db_session)
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
        return await self.repository.count_bosses(exclude_sub=exclude_sub)

    async def _ensure_department_exists(self, department_id: int) -> None:
        department = await self.repository.get_department_by_id(department_id)
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )

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

    @staticmethod
    def _ensure_can_manage_departments(actor_role: UserRole) -> None:
        if actor_role in {UserRole.admin, UserRole.boss}:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage departments.",
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
        existing_rows = await self.repository.list_ticket_access_for_ticket_and_user(
            ticket_id=ticket_id,
            user_sub=candidate.sub,
        )
        if any(row.permission in {PermissionType.ASSIGN, PermissionType.DELEGATE} for row in existing_rows):
            return

        await self.repository.add_ticket_access(
            ticket_id=ticket_id,
            user_sub=candidate.sub,
            permission=(
                PermissionType.DELEGATE if candidate.role == UserRole.boss else PermissionType.ASSIGN
            ),
            granted_by_sub=granted_by_sub,
        )

    async def _reassign_tickets_for_removed_member(
        self,
        *,
        removed_user: User,
        granted_by_sub: str | None,
    ) -> None:
        removed_sub = removed_user.sub
        access_rows = await self.repository.list_ticket_access_by_user_sub(removed_sub)
        conversations = await self.repository.list_conversations_by_sg_member_sub(removed_sub)

        if not access_rows and not conversations:
            return

        granter_subs = {
            row.granted_by_sub
            for row in access_rows
            if row.granted_by_sub and row.granted_by_sub != removed_sub
        }
        granter_map: dict[str, User] = {}
        if granter_subs:
            granters = await self.repository.get_users_by_subs(list(granter_subs))
            granter_map = {granter.sub: granter for granter in granters}

        fallback_bosses = await self.repository.get_fallback_bosses(removed_sub)

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

        await self.repository.delete_ticket_accesses_by_user_sub(removed_sub)

    async def _build_sg_member_response(self, user: User) -> schemas.SGMemberResponseDTO:
        sg_assigner: User | None = None
        if user.sg_assigned_by_sub:
            sg_assigner = await self.repository.get_user_by_sub(user.sg_assigned_by_sub)

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

        users = await self.repository.search_users_for_sg(q=q, limit=limit)

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

        members = await self.repository.list_sg_members(list(self.SG_MEMBER_ROLES))
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

        target_user = await self.repository.get_user_by_sub(
            payload.target_user_sub, with_department=True
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

        role_changed = previous_role != payload.role
        is_new_sg_member = previous_role not in self.SG_MEMBER_ROLES
        if is_new_sg_member or role_changed or target_user.sg_assigned_at is None:
            target_user.sg_assigned_at = datetime.utcnow()
            target_user.sg_assigned_by_sub = actor_sub

        await self.db_session.commit()

        target_user = await self.repository.get_user_by_sub(
            payload.target_user_sub, with_department=True
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

        actor_user = await self.repository.get_user_by_sub(actor_sub)
        if not actor_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Current user not found",
            )

        target_user = await self.repository.get_user_by_sub(target_user_sub)
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
        if actor_role == UserRole.capo:
            if target_user.role != UserRole.soldier:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Capos can remove only soldiers.",
                )

            actor_department_id = actor_user.department_id
            if actor_department_id is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account has no department assigned.",
                )

            if target_user.department_id != actor_department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Capos can remove soldiers only in their own department.",
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

        actor_user = await self.repository.get_user_by_sub(actor_sub)
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
        departments = await self.repository.list_departments()
        return [schemas.DepartmentResponseDTO.model_validate(dept) for dept in departments]

    async def get_departments_authorized(
        self,
        user: tuple[dict, dict],
    ) -> List[schemas.DepartmentResponseDTO]:
        TicketPolicy(user).check_read_sg_members()
        return await self.get_departments()

    async def create_department(
        self,
        *,
        payload: schemas.DepartmentCreatePayload,
    ) -> schemas.DepartmentResponseDTO:
        normalized_name = payload.name.strip()
        if not normalized_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department name is required.",
            )

        existing = await self.repository.get_department_by_name(normalized_name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department with this name already exists.",
            )

        next_department_id = (await self.repository.get_max_department_id()) + 1
        department = Department(
            id=next_department_id,
            name=normalized_name,
            is_special=payload.is_special,
        )
        await self.repository.add_department(department)
        await self.db_session.commit()
        return schemas.DepartmentResponseDTO.model_validate(department)

    async def create_department_authorized(
        self,
        *,
        user: tuple[dict, dict],
        payload: schemas.DepartmentCreatePayload,
    ) -> schemas.DepartmentResponseDTO:
        actor_role = self._current_role(user)
        self._ensure_can_manage_departments(actor_role)
        return await self.create_department(payload=payload)

    async def delete_department(
        self,
        *,
        actor_sub: str,
        department_id: int,
    ) -> schemas.SGMemberActionResult:
        if department_id == 9:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SG root department cannot be deleted.",
            )

        department = await self.repository.get_department_by_id(department_id)
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )

        users = await self.repository.list_users_by_department(department_id)
        sg_users = [user for user in users if user.role in self.SG_MEMBER_ROLES]

        bosses_to_remove = [user for user in sg_users if user.role == UserRole.boss]
        if bosses_to_remove:
            total_bosses = await self._count_bosses()
            if total_bosses - len(bosses_to_remove) <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="At least one boss must remain in the system.",
                )

        for member in sg_users:
            member.role = UserRole.default
            member.department_id = None
            member.sg_assigned_at = None
            member.sg_assigned_by_sub = None

        for user in users:
            if user.role in self.SG_MEMBER_ROLES:
                continue
            user.department_id = None

        await self.db_session.flush()

        for member in sg_users:
            await self._reassign_tickets_for_removed_member(
                removed_user=member,
                granted_by_sub=actor_sub,
            )

        await self.repository.delete_department(department)
        await self.db_session.commit()
        return schemas.SGMemberActionResult(
            detail=f"Department deleted. Removed {len(sg_users)} SG member(s) from SG.",
        )

    async def delete_department_authorized(
        self,
        *,
        user: tuple[dict, dict],
        department_id: int,
    ) -> schemas.SGMemberActionResult:
        actor_sub = self._current_sub(user)
        actor_role = self._current_role(user)
        self._ensure_can_manage_departments(actor_role)
        return await self.delete_department(actor_sub=actor_sub, department_id=department_id)

    async def get_sg_users(self, department_id: int) -> List[schemas.SGUserResponse]:
        users = await self.repository.list_sg_users_by_department(department_id)
        return [
            schemas.SGUserResponse(
                user=ShortUserResponse.model_validate(user),
                department_name=user.department.name if user.department else "N/A",
                role=user.role,
            )
            for user in users
        ]

    async def get_sg_users_authorized(
        self,
        department_id: int,
        user: tuple[dict, dict],
    ) -> List[schemas.SGUserResponse]:
        TicketPolicy(user).check_read_sg_members()
        return await self.get_sg_users(department_id=department_id)

    async def get_user_entity_or_404(
        self, user_sub: str, detail: str = "User not found"
    ) -> User:
        user = await self.repository.get_user_by_sub(user_sub)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
        return user

    async def get_ticket_entity_or_404(self, ticket_id: int) -> Ticket:
        ticket = await self.repository.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        return ticket

    async def get_user_ticket_access(
        self, ticket: Ticket, user_tuple: tuple[dict, dict]
    ) -> TicketAccess | None:
        user_sub = user_tuple[0].get("sub")
        if not user_sub:
            return None
        return await self.repository.get_ticket_access_for_ticket_and_user(ticket.id, user_sub)

    async def delegate_access(
        self,
        ticket: Ticket,
        granter_sub: str,
        grantee_sub: str,
        permission: PermissionType,
    ) -> TicketAccess:
        existing_accesses = await self.repository.list_ticket_access_for_ticket_and_user(
            ticket_id=ticket.id,
            user_sub=grantee_sub,
        )
        existing_access = next(
            (access for access in existing_accesses if access.permission == permission),
            None,
        )
        if existing_access:
            return existing_access

        new_access = TicketAccess(
            ticket_id=ticket.id,
            user_sub=grantee_sub,
            permission=permission,
            granted_by_sub=granter_sub,
        )

        await self.repository.add_delegated_access(new_access)
        await self.notification_service.notify_ticket_access_granted(ticket, new_access)
        if self.notion_service:
            await self.notion_service.notify_notion(ticket)
        return new_access

    async def delegate_ticket_access(
        self,
        *,
        ticket: Ticket,
        user_tuple: tuple[dict, dict],
        payload: schemas.DelegateAccessPayload,
    ) -> TicketAccess:
        target_user = await self.get_user_entity_or_404(
            payload.target_user_sub,
            detail="Target user not found",
        )
        user_access = await self.get_user_ticket_access(ticket, user_tuple)
        TicketPolicy(user_tuple).check_delegate(target_user, user_access)
        return await self.delegate_access(
            ticket=ticket,
            granter_sub=self._current_sub(user_tuple),
            grantee_sub=payload.target_user_sub,
            permission=payload.permission,
        )

    async def delegate_ticket_access_by_id(
        self,
        *,
        ticket_id: int,
        user_tuple: tuple[dict, dict],
        payload: schemas.DelegateAccessPayload,
    ) -> TicketAccess:
        """Load ticket and delegate access; 404 if ticket not found."""
        ticket = await self.get_ticket_entity_or_404(ticket_id)
        return await self.delegate_ticket_access(
            ticket=ticket,
            user_tuple=user_tuple,
            payload=payload,
        )
