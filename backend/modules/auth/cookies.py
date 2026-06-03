from fastapi import Response

from backend.core.configs.config import config


def set_kc_auth_cookies(response: Response, creds: dict) -> None:
    response.set_cookie(
        key=config.COOKIE_ACCESS_NAME,
        value=creds["access_token"],
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=3600,
    )
    response.set_cookie(
        key=config.COOKIE_REFRESH_NAME,
        value=creds["refresh_token"],
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=30 * 24 * 60 * 60,
    )


def unset_kc_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=config.COOKIE_ACCESS_NAME)
    response.delete_cookie(key=config.COOKIE_REFRESH_NAME)


def set_app_token_cookie(response: Response, app_token: str, max_age_seconds: float) -> None:
    response.set_cookie(
        key=config.COOKIE_APP_NAME,
        value=app_token,
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=max_age_seconds,
    )
