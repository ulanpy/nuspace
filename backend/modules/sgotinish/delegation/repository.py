from typing import Sequence

from backend.common.cruds import QueryBuilder
from backend.core.database.models.sgotinish import (
    Conversation,
    Department,
    PermissionType,
    Ticket,
    TicketAccess,
)
from backend.core.database.models.user import User, UserRole
from sqlalchemy import delete, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement


class DelegationRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def count_bosses(self, exclude_sub: str | None = None) -> int:
        filters = [User.role == UserRole.boss]
        if exclude_sub:
            filters.append(User.sub != exclude_sub)
        return await (
            QueryBuilder(self.db_session, User)
            .base(count=True)
            .filter(*filters)
            .count()
        )

    async def get_department_by_id(self, department_id: int) -> Department | None:
        return await (
            QueryBuilder(self.db_session, Department)
            .base()
            .filter(Department.id == department_id)
            .first()
        )

    async def get_user_by_sub(self, user_sub: str, with_department: bool = False) -> User | None:
        qb = QueryBuilder(self.db_session, User).base().filter(User.sub == user_sub)
        if with_department:
            qb = qb.eager(User.department)
        return await qb.first()

    async def get_users_by_subs(self, user_subs: Sequence[str]) -> list[User]:
        if not user_subs:
            return []
        return await (
            QueryBuilder(self.db_session, User)
            .base()
            .filter(User.sub.in_(list(user_subs)))
            .all()
        )

    async def get_fallback_bosses(self, excluded_sub: str) -> list[User]:
        return await (
            QueryBuilder(self.db_session, User)
            .base()
            .filter(User.role == UserRole.boss, User.sub != excluded_sub)
            .order(User.sg_assigned_at.asc().nullsfirst(), User.created_at.asc())
            .all()
        )

    async def search_users_for_sg(self, q: str | None, limit: int) -> list[User]:
        filters: list[ColumnElement[bool]] = []
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
        return await (
            QueryBuilder(self.db_session, User)
            .base()
            .filter(*filters)
            .eager(User.department)
            .order(User.name.asc(), User.surname.asc())
            .paginate(size=limit, page=1)
            .all()
        )

    async def list_sg_members(self, sg_roles: list[UserRole]) -> list[User]:
        return await (
            QueryBuilder(self.db_session, User)
            .base()
            .filter(User.role.in_(sg_roles))
            .eager(User.department)
            .all()
        )

    async def list_ticket_access_by_user_sub(self, user_sub: str) -> list[TicketAccess]:
        return await (
            QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(TicketAccess.user_sub == user_sub)
            .all()
        )

    async def list_ticket_access_for_ticket_and_user(
        self, ticket_id: int, user_sub: str
    ) -> list[TicketAccess]:
        return await (
            QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(TicketAccess.ticket_id == ticket_id, TicketAccess.user_sub == user_sub)
            .all()
        )

    async def get_ticket_access_for_ticket_and_user(
        self, ticket_id: int, user_sub: str
    ) -> TicketAccess | None:
        return await (
            QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(TicketAccess.ticket_id == ticket_id, TicketAccess.user_sub == user_sub)
            .first()
        )

    async def add_ticket_access(
        self,
        *,
        ticket_id: int,
        user_sub: str,
        permission: PermissionType,
        granted_by_sub: str | None,
    ) -> None:
        self.db_session.add(
            TicketAccess(
                ticket_id=ticket_id,
                user_sub=user_sub,
                permission=permission,
                granted_by_sub=granted_by_sub,
            )
        )

    async def add_delegated_access(self, access: TicketAccess) -> TicketAccess:
        await QueryBuilder(self.db_session, TicketAccess).add_orm_list(
            [access], [TicketAccess.user, TicketAccess.granter]
        )
        return access

    async def delete_ticket_accesses_by_user_sub(self, user_sub: str) -> None:
        await self.db_session.execute(delete(TicketAccess).where(TicketAccess.user_sub == user_sub))

    async def list_conversations_by_sg_member_sub(self, user_sub: str) -> list[Conversation]:
        return await (
            QueryBuilder(self.db_session, Conversation)
            .base()
            .filter(Conversation.sg_member_sub == user_sub)
            .all()
        )

    async def list_departments(self) -> list[Department]:
        return await QueryBuilder(self.db_session, Department).base().all()

    async def list_sg_users_by_department(self, department_id: int) -> list[User]:
        sg_roles = [UserRole.boss, UserRole.capo, UserRole.soldier]
        return await (
            QueryBuilder(self.db_session, User)
            .base()
            .filter(User.department_id == department_id, User.role.in_(sg_roles))
            .eager(User.department)
            .all()
        )

    async def get_ticket_by_id(self, ticket_id: int) -> Ticket | None:
        return await (
            QueryBuilder(self.db_session, Ticket)
            .base()
            .filter(Ticket.id == ticket_id)
            .eager(Ticket.author)
            .option(selectinload(Ticket.conversations).selectinload(Conversation.sg_member))
            .first()
        )
