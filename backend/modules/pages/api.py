from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.exc import IntegrityError

from backend.common.dependencies import get_infra
from backend.common.schemas import Infra
from backend.modules.auth.dependencies import get_creds_or_401, get_creds_or_guest
from backend.modules.pages import schemas
from backend.modules.pages.constants import PageAdminSort, PageRole, PageSort
from backend.modules.pages.dependencies import get_page_service
from backend.modules.pages.models.page import PageVisibility
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
    role: PageRole | None = Query(default=None, description="owner | admin"),
    visibility: list[PageVisibility] | None = Query(default=None),
    sort: PageSort | None = None,
    order: Literal["asc", "desc"] = "desc",
) -> schemas.ListPage:
    """The pages the caller runs: the ones they own and the ones they administer,
    at whatever visibility, owned first.

    `private` belongs here and only here: this is the list you manage your
    pages in, and a private page you made is the reason to have it.

    ### `role`, and why it means what it means

    `role=admin` is **administered by the caller AND NOT owned by them**, and is
    therefore disjoint from `role=owner`. A page you own *and* administer comes
    back under `owner` only.

    That clause is not decoration. An earlier version of this endpoint had no
    `role` parameter at all, removed in `b176a18`, and the reason it was
    removed is worth keeping in the code rather than in a commit message: the
    `mine` scope used to carry a visibility OR that contained `owner = me`, so
    `role=admin` compiled to `(visible OR administered-by-me)` where `visible`
    already meant "or owned by me". Every owned page came back under both
    filters and the same row appeared twice. Two things are true at once and
    they are the whole story:

    - **The overlap was the bug.** Fix it by making the values disjoint.
    - **A filter that can widen its scope is the bug's real shape.** That is
      also why `include_private` (a boolean that flipped what the endpoint
      meant) and a derived `owner_sub` are both gone for good.

    Deleting the filter fixed the symptom and cost the ability to ask the
    question, which is why it is back with the overlap closed. If you widen
    this endpoint, keep the `NOT owner` clause in
    `PageRepository._list_conditions`.

    ### The Meilisearch trap

    `sort` and `visibility` are **silently ignored when `keyword` is set**. The
    keyword path short-circuits to Meilisearch, which ranks by relevance and
    has `filterable_attributes=None`, so there is no facet to filter on either.
    No error, just wrong rows — which is how you get "the sort button does
    nothing". My Pages has no search box today, so this is unreachable. Adding
    one means `filterableAttributes` in `modules/pages/search_indexes.py` plus
    a reindex, not just a UI control.
    """
    return await page_service.list_my_pages(
        infra=infra,
        user=user,
        page=page,
        size=size,
        keyword=keyword,
        role=role,
        visibility=visibility,
        sort=sort,
        order=order,
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
    sort: PageAdminSort | None = None,
    order: Literal["asc", "desc"] = "desc",
    page_service: PageService = Depends(get_page_service),
) -> schemas.ListPageAdmins:
    """Retrieves a paginated list of a page's admins. Owner, page admin or site admin only.

    `exclude_sub` drops one user from the rows *and* the count, so a caller
    rendering that user in a separate pinned row keeps correct page boundaries.

    `sort` and `order` only — deliberately **no** `role` and **no** `visibility`
    here, unlike `/pages/mine`. The owner is not in this list at all, so
    "owner vs admin" is a column here, not a filter; and the admins of a page
    are its admins whatever the pages' visibility is set to.
    """
    return await page_service.list_admins(
        slug=slug,
        user=user,
        page=page,
        size=size,
        exclude_sub=exclude_sub,
        sort=sort,
        order=order,
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
