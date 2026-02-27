from datetime import datetime

from fastapi import HTTPException
from fastapi import status as http_status

from backend.core.database.models.sgotinish import PermissionType, TicketAccess
from backend.core.database.models.user import User, UserRole
from backend.modules.sgotinish.base import BasePolicy


class DelegationPolicy(BasePolicy):
    """Permissions for SG delegation and membership management."""

    SG_MEMBER_ROLES = {UserRole.boss, UserRole.capo, UserRole.soldier}
    SG_MANAGEMENT_ROLES = {UserRole.admin, UserRole.boss, UserRole.capo}
    SG_OR_ADMIN_ROLES = {UserRole.admin, UserRole.boss, UserRole.capo, UserRole.soldier}
    DEPARTMENT_MANAGERS = {UserRole.admin, UserRole.boss}

    @staticmethod
    def is_sg_or_admin_role(role: UserRole) -> bool:
        return role in DelegationPolicy.SG_OR_ADMIN_ROLES

    def check_manage_sg_members(self) -> None:
        if self.user_role in self.SG_MANAGEMENT_ROLES:
            return
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage SG members.",
        )

    def check_view_sg_members(self) -> None:
        if self.user_role in self.SG_OR_ADMIN_ROLES:
            return
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view SG members.",
        )

    def check_manage_departments(self) -> None:
        if self.user_role in self.DEPARTMENT_MANAGERS:
            return
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage departments.",
        )

    def check_membership_assignment(
        self,
        *,
        target_role: UserRole,
        target_department_id: int,
    ) -> None:
        if self.user_role in {UserRole.admin, UserRole.boss}:
            return

        if self.user_role == UserRole.capo:
            if target_role != UserRole.soldier:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Capos can assign only the soldier role.",
                )
            if self.department_id is None:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Your account has no department assigned.",
                )
            if target_department_id != self.department_id:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Capos can assign members only in their own department.",
                )
            return

        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage SG members.",
        )

    @staticmethod
    def check_target_reassignable(target_user: User) -> None:
        if target_user.role == UserRole.admin:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Admin users cannot be reassigned through SG management.",
            )

    def check_remove_request(self, *, target_user_sub: str) -> None:
        if self.user_role not in self.SG_MANAGEMENT_ROLES:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to remove SG members.",
            )
        if target_user_sub == self.user_sub:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Use self-withdraw to remove your own SG role.",
            )

    def check_remove_target(
        self,
        *,
        actor_user: User,
        target_user: User,
    ) -> None:
        if target_user.role not in self.SG_MEMBER_ROLES:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Target user is not an SG member.",
            )

        if self.user_role == UserRole.capo:
            if target_user.role != UserRole.soldier:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Capos can remove only soldiers.",
                )

            actor_department_id = actor_user.department_id
            if actor_department_id is None:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Your account has no department assigned.",
                )

            if target_user.department_id != actor_department_id:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Capos can remove soldiers only in their own department.",
                )

        if self.user_role == UserRole.boss and target_user.role == UserRole.boss:
            actor_boss_time = actor_user.sg_assigned_at or actor_user.created_at or datetime.min
            target_boss_time = target_user.sg_assigned_at or target_user.created_at or datetime.min
            if actor_boss_time > target_boss_time:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="You cannot remove a boss who was assigned before you.",
                )

    def check_withdraw_from_sg(self) -> None:
        if self.user_role in self.SG_MEMBER_ROLES:
            return
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Only SG members can withdraw.",
        )

    @staticmethod
    def check_bosses_can_remain(
        remaining_bosses: int,
        *,
        withdrawing_self: bool = False,
    ) -> None:
        if remaining_bosses > 0:
            return
        if withdrawing_self:
            detail = "You are the last boss. Add another boss before withdrawing."
        else:
            detail = "At least one boss must remain in the system."
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    @staticmethod
    def check_department_deletable(department_id: int) -> None:
        if department_id == 9:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="SG root department cannot be deleted.",
            )

    def check_delegate_ticket_access(
        self,
        *,
        target_user: User,
        user_access: TicketAccess | None,
    ) -> None:
        if not self.is_admin and (
            not user_access or user_access.permission != PermissionType.DELEGATE
        ):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delegate access for this ticket.",
            )

        if self.user_role == UserRole.boss or self.is_admin:
            return

        if self.user_role == UserRole.capo:
            if target_user.role != UserRole.soldier:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Capos can only delegate to Soldiers.",
                )
            if target_user.department_id != self.department_id:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="You can only delegate to Soldiers within your own department.",
                )
            return

        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delegate.",
        )
