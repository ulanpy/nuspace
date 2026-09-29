from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.exc import IntegrityError

from backend.common.dependencies import get_infra
from backend.common.schemas import Infra
from backend.modules.auth.dependencies import get_creds_or_401, get_creds_or_guest
from backend.modules.pages import schemas
from backend.modules.pages.dependencies import get_page_service
from backend.modules.pages.service import PageService
from backend.modules.shared.slug import raise_slug_taken

router = APIRouter(tags=["Page Routes"])


@router.post("/pages", response_model=schemas.PageResponse)
async def add_page(
    request: Request,
    page_data: schemas.PageCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
) -> schemas.PageResponse:
    """
    Create a new page. Any registered user can create pages.

    **Access Policy:**
    - Any registered user can create pages
    - Users can only create pages for themselves (owner must be "me" or their own sub)
    """
    try:
        return await page_service.create_page(infra=infra, page_data=page_data, user=user)
    except IntegrityError:
        raise_slug_taken()


@router.get("/pages", response_model=schemas.ListPage)
async def get_pages(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
    keyword: str | None = Query(default=None, description="Search keyword for page name"),
) -> schemas.ListPage:
    """The public directory: pages anyone may browse.

    `public`, plus `internal` for a signed-in viewer. Never a `private` page,
    not even the caller's own — a private page is not a directory entry, and
    one that appeared here only because its owner happened to be signed in
    would be the one page in the app that was never meant to be listed.

    The pages you own or administer, at any visibility, are a different
    question with a different answer, so they are a different endpoint:
    `GET /pages/mine`.
    """
    return await page_service.list_browsable_pages(
        infra=infra,
        user=user,
        page=page,
        size=size,
        keyword=keyword,
    )


@router.get("/pages/mine", response_model=schemas.ListPage)
async def get_my_pages(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
    keyword: str | None = Query(default=None, description="Search keyword for page name"),
) -> schemas.ListPage:
    """The pages the caller runs: the ones they own and the ones they administer,
    at whatever visibility, owned first.

    `private` belongs here and only here: this is the list you manage your
    pages in, and a private page you made is the reason to have it.

    No `role` parameter. There was one, to split this into an Owned tab and an
    Admin tab, and the tabs held identical rows that both just link to the page
    — the `Owner`/`Admin` badge on each row already said which relationship it
    was. All it bought was a way to hide rows, and every version of the
    visibility rules under it leaked between the two tabs.
    """
    return await page_service.list_my_pages(
        infra=infra,
        user=user,
        page=page,
        size=size,
        keyword=keyword,
    )


@router.get("/pages/{slug}", response_model=schemas.PageResponse)
async def get_page(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
) -> schemas.PageResponse:
    """Retrieves a specific page by slug."""
    return await page_service.get_page_response(infra=infra, slug=slug, user=user)


@router.patch("/pages/{slug}", response_model=schemas.PageResponse)
async def update_page(
    request: Request,
    slug: str,
    new_data: schemas.PageUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
) -> schemas.PageResponse:
    """Updates fields of an existing page. Owner, page admin or site admin only."""
    try:
        return await page_service.update_page(infra=infra, slug=slug, new_data=new_data, user=user)
    except IntegrityError:
        raise_slug_taken()


@router.delete("/pages/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
):
    """Deletes a page. Owner or site admin only."""
    await page_service.delete_page(infra=infra, slug=slug, user=user)


@router.patch("/pages/{slug}/owner", response_model=schemas.PageResponse)
async def reassign_page_owner(
    request: Request,
    slug: str,
    body: schemas.PageOwnerUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
) -> schemas.PageResponse:
    """Reassign page owner. The previous owner becomes an admin. Site admin or owner only."""
    return await page_service.reassign_owner(
        infra=infra, slug=slug, new_owner_sub=body.owner_sub, user=user
    )


@router.get("/pages/{slug}/admin-link", response_model=schemas.AdminLinkResponse)
async def get_page_admin_link(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
) -> schemas.AdminLinkResponse:
    """Get a shareable admin access link for the page. Owner or page admin only."""
    return await page_service.view_admin_link(infra=infra, slug=slug, user=user)


@router.post("/pages/{slug}/admin-link/rotate", response_model=schemas.AdminLinkResponse)
async def rotate_page_admin_link(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
) -> schemas.AdminLinkResponse:
    """Rotate the admin access link, invalidating the previous one. Owner or page admin only."""
    return await page_service.rotate_admin_link(infra=infra, slug=slug, user=user)


@router.get("/pages/{slug}/admins", response_model=schemas.ListPageAdmins)
async def get_page_admins(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    exclude_sub: str | None = None,
    page_service: PageService = Depends(get_page_service),
) -> schemas.ListPageAdmins:
    """Retrieves a paginated list of a page's admins. Owner, page admin or site admin only.

    `exclude_sub` drops one user from the rows *and* the count, so a caller
    rendering that user in a separate pinned row keeps correct page boundaries.
    """
    return await page_service.list_admins(
        slug=slug, user=user, page=page, size=size, exclude_sub=exclude_sub
    )


@router.delete("/pages/{slug}/admins/me", response_model=schemas.PageResponse)
async def leave_page_admin(
    request: Request,
    slug: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
) -> schemas.PageResponse:
    """Leave a page as an admin. Owner cannot leave this way."""
    return await page_service.leave_admin(infra=infra, slug=slug, user=user)


@router.delete("/pages/{slug}/admins/{user_sub}", response_model=schemas.PageResponse)
async def remove_page_admin(
    request: Request,
    slug: str,
    user_sub: str,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
) -> schemas.PageResponse:
    """Remove an admin from a page. Site admin or owner only."""
    return await page_service.remove_admin(infra=infra, slug=slug, user_sub=user_sub, user=user)


@router.post("/pages/admin-links/accept", response_model=schemas.AdminLinkAcceptResponse)
async def accept_page_admin_link(
    request: Request,
    body: schemas.AdminLinkAcceptRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
) -> schemas.AdminLinkAcceptResponse:
    """Redeem an admin access link. Idempotent; no-op if already admin or owner."""
    return await page_service.accept_admin_link(infra=infra, token=body.token, user=user)
