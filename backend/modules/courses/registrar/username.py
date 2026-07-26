class RegistrarDebugUsernameMissing(RuntimeError):
    """Debug registrar access was attempted without an explicit safe username."""


def resolve_registrar_username(
    email: object,
    *,
    is_debug: bool,
    debug_username: str | None,
) -> str:
    """
    Resolve credentials without ever falling back to a mock identity in debug.

    Production keeps using the local part of the authenticated NU email. Debug
    mode must opt in with a nonblank username before any registrar call occurs.
    """
    if is_debug:
        username = (debug_username or "").strip()
        if not username:
            raise RegistrarDebugUsernameMissing(
                "Registrar sync is unavailable until REGISTRAR_DEBUG_USERNAME is configured."
            )
        return username

    if not isinstance(email, str) or "@" not in email:
        raise ValueError("The signed-in account does not have a valid email address.")

    username = email.split("@", 1)[0].strip()
    if not username:
        raise ValueError("The signed-in account does not have a valid email address.")
    return username
