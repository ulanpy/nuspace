from fastapi import Response

from backend.core.configs.config import config

# Every auth cookie is set on, and deleted from, the parent domain (`.nuspace.kz`;
# host-only in dev), so one sign-in covers every host and so does one sign-out.
# A deletion without the same domain would leave the parent-domain cookie alive.


def _delete_cookie(response: Response, key: str) -> None:
    response.delete_cookie(key=key, domain=config.COOKIE_DOMAIN)
    if config.COOKIE_DOMAIN:
        # Host-only cookies set before the parent domain was (on the apex) would
        # otherwise survive a sign-out until they expire.
        response.delete_cookie(key=key)


def set_kc_auth_cookies(response: Response, creds: dict) -> None:
    response.set_cookie(
        key=config.COOKIE_ACCESS_NAME,
        value=creds["access_token"],
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=3600,
        domain=config.COOKIE_DOMAIN,
    )
    response.set_cookie(
        key=config.COOKIE_REFRESH_NAME,
        value=creds["refresh_token"],
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=30 * 24 * 60 * 60,
        domain=config.COOKIE_DOMAIN,
    )


def unset_kc_auth_cookies(response: Response) -> None:
    _delete_cookie(response, config.COOKIE_ACCESS_NAME)
    _delete_cookie(response, config.COOKIE_REFRESH_NAME)


def set_app_token_cookie(response: Response, app_token: str, max_age_seconds: float) -> None:
    response.set_cookie(
        key=config.COOKIE_APP_NAME,
        value=app_token,
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        # Max-Age must be an integer: cookie jars reject `Max-Age=300.0`.
        max_age=int(max_age_seconds),
        domain=config.COOKIE_DOMAIN,
    )


def unset_app_token_cookie(response: Response) -> None:
    _delete_cookie(response, config.COOKIE_APP_NAME)
