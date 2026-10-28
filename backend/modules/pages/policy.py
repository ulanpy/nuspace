from collections.abc import Collection

from fastapi import HTTPException, status

from backend.common.utils.enums import ResourceAction
from backend.modules.auth.models import UserRole
from backend.modules.pages.models.page import Page
from backend.modules.pages.schemas import PageCreateRequest
from backend.modules.shared.visibility import RecordVisibility, visible_to


def page_visibility(page: Page, *, admins: Collection[str] = ()) -> RecordVisibility:
    """A Page as `visible_to` sees it: its tier, managed by its owner and its admins.

    `admins` only has to include the viewer when the viewer is one: the
    predicate asks whether the viewer manages the page, nothing more, so a
    caller that already knows that need not load every admin.
    """
    return RecordVisibility(tier=page.visibility, managers={page.owner, *admins})


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
        """A page the viewer may not read 404s rather than 403s.

        A 403 would confirm the page exists to someone with no business knowing
        it does. `visible_to` decides; the owner, the page's own admins and site
        admins read every tier, so a page can be previewed before it is
        published, and a private page is not unmanageable by anyone but its
        owner.
        """
        admins = [self.user_sub] if self.is_page_admin else []
        if not visible_to(self.user, page_visibility(page, admins=admins)):
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
