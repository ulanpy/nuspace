import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

RESERVED_SLUGS = {
    "edit",
    "admin",
    "new",
    "create",
    "api",
    "settings",
    "about",
    "terms-of-service",
    "privacy-policy",
    "communities",
    "users",
    "events",
    "courses",
    "announcements",
    "contacts",
    "opportunities",
    "profile",
    "sgotinish",
}

SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")


def validate_slug(slug: str) -> str:
    """Validate a slug. Returns the slug if valid, raises ValueError otherwise."""
    if not SLUG_RE.match(slug):
        raise ValueError(
            "Slug must be lowercase alphanumeric with hyphens "
            "(no leading/trailing/double hyphens)"
        )
    if len(slug) < 3 or len(slug) > 50:
        raise ValueError("Slug must be 3-50 characters")
    if slug in RESERVED_SLUGS:
        raise ValueError(f"'{slug}' is a reserved word and cannot be used as a slug")
    return slug


def base_slug(input_text: str) -> str:
    """Slugify input text, mirroring the DB's slug normalisation (no uniqueness)."""
    slug = _NON_ALNUM_RE.sub("-", input_text.lower()).strip("-")
    slug = slug[:50].rstrip("-")
    if len(slug) < 3:
        slug = (slug + "-page")[:50].rstrip("-")
    return slug


async def generate_unique_slug(input_text: str, model, *, session: AsyncSession) -> str:
    """
    Generate a slug that is unique for the given table-backed model and not a
    reserved word, mirroring the migration's generate_unique_slug() function.
    """
    base = base_slug(input_text)
    candidate = base
    suffix = 2
    while True:
        if candidate not in RESERVED_SLUGS:
            result = await session.execute(select(model).where(model.slug == candidate))
            if result.scalars().first() is None:
                return candidate
        candidate = f"{base[: 50 - len(str(suffix))]}-{suffix}"
        suffix += 1
