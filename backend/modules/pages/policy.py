from fastapi import HTTPException, status

from backend.common.utils.enums import ResourceAction
from backend.modules.auth.models import UserRole
from backend.modules.pages.models.page import Page
from backend.modules.pages.schemas import PageCreateRequest


class PagePolicy:
    """
    Page policy class for centralized permission checking.

    **Note**
    When extending this class, keep in mind that it should only handle permission checking.
    All other logic should be kept outside of this class.
    """

    def __init__(self, user: tuple[dict, dict], is_page_admin: bool = False):
        self.user = user
        self.user_role: str = user[1]["role"]
        self.user_sub: str = user[0]["sub"]
        self.is_page_admin = is_page_admin
        self.is_admin = self.user_role == UserRole.admin.value

    def _is_owner(self, page: Page) -> bool:
        # The FK column, never `page.owner_user.sub`: the relationship is None on
        # an ownerless page, and this runs on every read and every update.
        return page.owner == self.user_sub

    def check_visible(self, page: Page) -> None:
        """Private and internal pages 404 rather than 403 for those who cannot see them.

        A 403 would confirm the page exists to someone with no business knowing
        it does. The owner, the page's own admins and site admins still get
        through, so a page can be previewed before it is published — and so a
        private page is not unmanageable by anyone but its owner.
        """
        if self.is_admin or self.is_page_admin or self._is_owner(page):
            return
        if page.visibility.value == "public":
            return
        if page.visibility.value == "internal" and not self.user[1].get("is_guest"):
            return
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    async def check_permission(
        self,
        action: ResourceAction,
        page: Page | None = None,
        page_data: PageCreateRequest | None = None,
    ) -> bool:
        """
        Centralized permission checking for page actions.

        Args:
            action: The action being performed
            user: The user performing the action
            page: Optional page object for actions that require it

        Raises:
            HTTPException: If the user doesn't have permission
        """
        # Admin can do everything
        if self.is_admin:
            return True

        if action == ResourceAction.CREATE:
            # Any registered user can create pages.
            if page_data and page_data.owner not in ("me", self.user_sub):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only create pages for yourself",
                )
            return True

        elif action == ResourceAction.READ:
            self.check_visible(page)
            return True

        elif action == ResourceAction.UPDATE:
            if self._is_owner(page) or self.is_page_admin:
                return True

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins or page owners can update pages",
            )

        elif action == ResourceAction.DELETE:
            if self._is_owner(page):
                return True

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins or page owners can delete pages",
            )

        # This should never happen as we've handled all enum cases
        raise ValueError(f"Unhandled action type: {action}")

    async def check_manage_admins(self, page: Page) -> bool:
        """Site-admin or owner may add/remove OTHER page admins."""
        if self.is_admin or self._is_owner(page):
            return True
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins or page owners can manage admins",
        )

    async def check_admin_link(self, page: Page) -> bool:
        """Site-admin, owner, or a page admin may view/rotate the access link."""
        if self.is_admin or self._is_owner(page) or self.is_page_admin:
            return True
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins or page owners can manage the admin access link",
        )

    async def check_self_leave(self, page: Page) -> bool:
        """Only a page admin may leave; an owner cannot resign via this path."""
        if self._is_owner(page):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Owners cannot leave a page",
            )
        if self.is_page_admin:
            return True
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only page admins can leave a page",
        )
