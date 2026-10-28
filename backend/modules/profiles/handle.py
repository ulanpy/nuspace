"""What a handle may be: a slug, and not one of the account host's own words.

A handle addresses a profile page at `my.nuspace.kz/u/<handle>`. The `/u/`
prefix already keeps it from colliding with the host's routes, but a handle
that reads like one (`/u/account`, `/u/profile`) is a phishing aid and a
confusing address, so the host's words are reserved here as well as the
slug list's.
"""

from backend.modules.shared.slug import validate_slug

# The account host's paths and the words it may grow into. Mirrors
# `web/src/lib/profiles/handle.ts`.
ACCOUNT_RESERVED_WORDS = frozenset(
    {
        "account",
        "pages",
        "profile",
        "u",
        "me",
        "my",
        "people",
        "settings",
        "edit",
        "admin",
        "nuspace",
    }
)


def validate_handle(handle: str) -> str:
    """Return the handle if it may be used, raise ValueError otherwise."""
    validate_slug(handle)
    if handle in ACCOUNT_RESERVED_WORDS:
        raise ValueError(f"'{handle}' is a reserved word and cannot be used as a handle")
    return handle
