from typing import Sequence

from backend.core.database.models.sgotinish import (
    Conversation,
    Department,
    PermissionType,
    Ticket,
    TicketAccess,
)
from backend.core.database.models.user import User, UserRole
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class DelegationRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def count_bosses(self, exclude_sub: str | None = None) -> int:
        stmt = select(func.count()).select_from(User).where(User.role == UserRole.boss)
        if exclude_sub:
            stmt = stmt.where(User.sub != exclude_sub)
        result = await self.db_session.execute(stmt)
        return (result.scalar() or 0)

    async def get_department_by_id(self, department_id: int) -> Department | None:
        stmt = select(Department).where(Department.id == department_id)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_department_by_name(self, name: str) -> Department | None:
        stmt = select(Department).where(func.lower(Department.name) == name.lower())
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_max_department_id(self) -> int:
        result = await self.db_session.execute(select(func.max(Department.id)))
        return int(result.scalar() or 0)

    async def add_department(self, department: Department) -> Department:
        self.db_session.add(department)
        await self.db_session.flush()
        return department

    async def delete_department(self, department: Department) -> None:
        await self.db_session.delete(department)

    async def get_user_by_sub(self, user_sub: str, with_department: bool = False) -> User | None:
        stmt = select(User).where(User.sub == user_sub)
        if with_department:
            stmt = stmt.options(selectinload(User.department))
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_users_by_subs(self, user_subs: Sequence[str]) -> list[User]:
        if not user_subs:
            return []
        stmt = select(User).where(User.sub.in_(list(user_subs)))
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_fallback_bosses(self, excluded_sub: str) -> list[User]:
        stmt = (
            select(User)
            .where(User.role == UserRole.boss, User.sub != excluded_sub)
            .order_by(User.sg_assigned_at.asc().nullsfirst(), User.created_at.asc())
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def search_users_for_sg(self, q: str | None, limit: int) -> list[User]:
        stmt = (
            select(User)
            .options(selectinload(User.department))
            .order_by(User.name.asc(), User.surname.asc())
            .limit(limit)
            .offset(0)
        )
        if q and (query := (q or "").strip()):
            pattern = f"%{query}%"
            stmt = stmt.where(
                or_(
                    User.name.ilike(pattern),
                    User.surname.ilike(pattern),
                    User.email.ilike(pattern),
                )
            )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def list_sg_members(self, sg_roles: list[UserRole]) -> list[User]:
        stmt = (
            select(User)
            .where(User.role.in_(sg_roles))
            .options(selectinload(User.department))
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def list_ticket_access_by_user_sub(self, user_sub: str) -> list[TicketAccess]:
        stmt = select(TicketAccess).where(TicketAccess.user_sub == user_sub)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def list_ticket_access_for_ticket_and_user(
        self, ticket_id: int, user_sub: str
    ) -> list[TicketAccess]:
        stmt = select(TicketAccess).where(
            TicketAccess.ticket_id == ticket_id,
            TicketAccess.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_ticket_access_for_ticket_and_user(
        self, ticket_id: int, user_sub: str
    ) -> TicketAccess | None:
        stmt = select(TicketAccess).where(
            TicketAccess.ticket_id == ticket_id,
            TicketAccess.user_sub == user_sub,
        ).limit(1)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

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
        self.db_session.add(access)
        await self.db_session.flush()
        stmt = (
            select(TicketAccess)
            .where(
                TicketAccess.ticket_id == access.ticket_id,
                TicketAccess.user_sub == access.user_sub,
                TicketAccess.permission == access.permission,
            )
            .options(
                selectinload(TicketAccess.user),
                selectinload(TicketAccess.granter),
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalar_one()

    async def delete_ticket_accesses_by_user_sub(self, user_sub: str) -> None:
        await self.db_session.execute(delete(TicketAccess).where(TicketAccess.user_sub == user_sub))

    async def list_conversations_by_sg_member_sub(self, user_sub: str) -> list[Conversation]:
        stmt = select(Conversation).where(Conversation.sg_member_sub == user_sub)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def list_departments(self) -> list[Department]:
        stmt = select(Department).order_by(Department.id.asc())
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def list_users_by_department(self, department_id: int) -> list[User]:
        stmt = select(User).where(User.department_id == department_id)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def list_sg_users_by_department(self, department_id: int) -> list[User]:
        sg_roles = [UserRole.boss, UserRole.capo, UserRole.soldier]
        stmt = (
            select(User)
            .where(User.department_id == department_id, User.role.in_(sg_roles))
            .options(selectinload(User.department))
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_ticket_by_id(self, ticket_id: int) -> Ticket | None:
        stmt = (
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                selectinload(Ticket.author),
                selectinload(Ticket.conversations).selectinload(Conversation.sg_member),
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()
