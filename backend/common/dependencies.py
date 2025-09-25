from typing import Annotated, AsyncGenerator

from backend.common.schemas import Infra
from backend.core.configs.config import config
from backend.core.database.manager import AsyncDatabaseManager
from backend.core.database.models import User, UserRole
from backend.modules.auth.app_token import AppTokenManager
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.auth.utils import (
    get_mock_user_by_sub,  # dev-only helper
    set_kc_auth_cookies,
)
from backend.modules.google_bucket.utils import get_signing_credentials
from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_infra(request: Request) -> Infra:
    """Dependency to get infrastructure dependencies with automatic credential refresh."""
    # Get fresh credentials if not in emulator mode
    signing_credentials = None
    if not config.USE_GCS_EMULATOR:
        current_credentials = request.app.state.signing_credentials

        if current_credentials is None or (
            hasattr(current_credentials, "expired") and current_credentials.expired
        ):
            # Create fresh credentials and update global state
            signing_credentials = get_signing_credentials(
                request.app.state.config.VM_SERVICE_ACCOUNT_EMAIL
            )
            request.app.state.signing_credentials = signing_credentials
        else:
            signing_credentials = current_credentials

    return Infra(
        meilisearch_client=request.app.state.meilisearch_client,
        storage_client=request.app.state.storage_client,
        config=request.app.state.config,
        signing_credentials=signing_credentials,
        redis=request.app.state.redis,
        broker=request.app.state.broker,
    )


async def get_db_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """Retrieve the database session from the shared db_manager"""
    db_manager: AsyncDatabaseManager = request.app.state.db_manager
    async for session in db_manager.get_async_session():
        yield session


async def get_creds_or_401(
    request: Request,
    response: Response,
    db_session: AsyncSession = Depends(get_db_session),
    access_token: Annotated[str | None, Cookie(alias=config.COOKIE_ACCESS_NAME)] = None,
    refresh_token: Annotated[str | None, Cookie(alias=config.COOKIE_REFRESH_NAME)] = None,
    app_token_cookie: Annotated[str | None, Cookie(alias=config.COOKIE_APP_NAME)] = None,
) -> tuple[dict, dict]:  # Returns (kc_principal, app_principal)
    """
    Authenticates a user by validating Keycloak and application-specific tokens.

    Flow:
    1.  **Token Presence:** Checks for `access_token` and `refresh_token` cookies (401 if missing).
    2.  **Keycloak Token:** Validates `access_token`. If expired, attempts refresh using
        `refresh_token`. New Keycloak tokens are set as cookies if refreshed. (401 on
        validation/refresh failure). The decoded Keycloak token becomes `kc_principal`.
    3.  **App Token:** Validates `app_token_cookie`.
        A new app token is issued (and set as a cookie) if:
        - Keycloak token was just refreshed.
        - App token cookie is missing.
        - App token is expired, invalid, or its subject doesn't match `kc_principal`'s subject.
        App token issuance may involve DB calls to fetch claims.
        The decoded/newly issued app token becomes `app_principal`.
    4.  **Authorization:** If `app_principal` cannot be established, raises 403 Forbidden.

    Returns:
        A tuple (`kc_principal`, `app_principal`).

    Raises:
        HTTPException:
            - 401 Unauthorized: For Keycloak token issues (missing, invalid, refresh failure).
            - 403 Forbidden: If a valid `app_principal` cannot be established.
    """
    # If refresh token exists but access token is missing, try silent refresh.
    # Otherwise, require both.
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access and/or refresh token cookie(s)",
        )

    kc_manager: KeyCloakManager = request.app.state.kc_manager
    app_token_manager: AppTokenManager = request.app.state.app_token_manager

    kc_principal: dict | None = None
    keycloak_token_refreshed = False

    # Attempt to recover when access_token is missing using refresh token
    if not access_token:
        try:
            new_kc_creds = await request.app.state.kc_manager.refresh_access_token(refresh_token)
            set_kc_auth_cookies(response, new_kc_creds)
            access_token = new_kc_creds["access_token"]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Failed to refresh Keycloak token: {str(e)}",
            )

    if config.MOCK_KEYCLOAK and access_token.startswith("mock_access_"):
        sub = access_token.removeprefix("mock_access_")
        u = get_mock_user_by_sub(sub)
        kc_principal = {
            "sub": u["sub"],
            "email": u["email"],
            "given_name": u["given_name"],
            "family_name": u["family_name"],
            "name": f"{u['given_name']} {u['family_name']}",
        }
    else:
        try:
            kc_principal = await kc_manager.validate_keycloak_token(access_token)
        except jwt.ExpiredSignatureError:
            try:
                new_kc_creds = await kc_manager.refresh_access_token(refresh_token)
                set_kc_auth_cookies(response, new_kc_creds)  # Sets new Keycloak cookies
                access_token = new_kc_creds[
                    "access_token"
                ]  # Use new access token for subsequent validation
                kc_principal = await kc_manager.validate_keycloak_token(access_token)
                keycloak_token_refreshed = True
            except Exception as e:
                # Failed to refresh Keycloak token
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Failed to refresh Keycloak token: {str(e)}",
                )
        except JWTError as e:
            # Other Keycloak token validation errors
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Keycloak token: {str(e)}",
            )

    if not kc_principal:  # Should not happen if logic above is correct, but as a safeguard
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not establish Keycloak principal.",
        )

    app_principal: dict | None = None
    issue_new_app_token = False

    if keycloak_token_refreshed:
        issue_new_app_token = True
    elif not app_token_cookie:
        issue_new_app_token = True
    else:
        try:
            app_principal = app_token_manager.validate_app_token(app_token_cookie)
            # Check if app token's subject matches Keycloak principal's subject
            if app_principal.get("sub") != kc_principal.get("sub"):
                issue_new_app_token = True  # Subject mismatch, re-issue
        except jwt.ExpiredSignatureError:
            issue_new_app_token = True  # App token expired
        except JWTError:
            issue_new_app_token = True  # App token invalid for other reasons

    if issue_new_app_token:
        try:
            new_app_token_str, new_app_claims = await app_token_manager.create_app_token(
                kc_principal["sub"], db_session
            )
            response.set_cookie(
                key=config.COOKIE_APP_NAME,
                value=new_app_token_str,
                httponly=True,
                secure=not config.IS_DEBUG,
                samesite="Lax",
                max_age=app_token_manager.token_expiry.total_seconds(),
            )
            app_principal = new_app_claims
        except Exception as e:
            # Log this error, but decide if it's critical to halt the request
            # For now, we'll proceed without a valid app_principal if creation fails
            # Consider raising an error if app_token is strictly required
            print(f"Error creating app token: {str(e)}")  # Replace with proper logging
            app_principal = {}  # Or None, depending on how you want to handle this

    if (
        not app_principal
    ):  # If still no app_principal (e.g. creation failed and not handled by raising error)
        # This might indicate a state where user has valid KC token but no app token.
        # Depending on policy, you might allow this, or raise an error.
        # For now, let's ensure it's at least an empty dict if not strictly required.
        # Or, if an app token is mandatory for all authenticated operations beyond this point:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,  # Or 401
            detail="Application access denied: App token could not be established.",
        )

    return kc_principal, app_principal


async def get_creds_or_guest(
    request: Request,
    response: Response,
    db_session: AsyncSession = Depends(get_db_session),
    access_token: Annotated[str | None, Cookie(alias=config.COOKIE_ACCESS_NAME)] = None,
    refresh_token: Annotated[str | None, Cookie(alias=config.COOKIE_REFRESH_NAME)] = None,
    app_token_cookie: Annotated[str | None, Cookie(alias=config.COOKIE_APP_NAME)] = None,
) -> tuple[dict, dict]:
    """
    Like get_creds_or_401, but returns a safe "guest" principal when unauthenticated
    or when token validation fails, instead of raising.

    Returns a tuple (kc_principal, app_principal)
    """
    guest_kc = {"sub": "guest"}
    guest_app = {"role": UserRole.default.value, "communities": [], "is_guest": True}

    # No auth cookies present → guest
    if not access_token or not refresh_token:
        return guest_kc, guest_app

    # Try to resolve authenticated principals; on any failure, fall back to guest
    try:
        return await get_creds_or_401(
            request=request,
            response=response,
            db_session=db_session,
            access_token=access_token,
            refresh_token=refresh_token,
            app_token_cookie=app_token_cookie,
        )
    except Exception:
        return guest_kc, guest_app


async def check_tg(
    user: Annotated[dict, Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
) -> bool:
    sub = user[0].get("sub")
    result = await db_session.execute(select(User.telegram_id).filter_by(sub=sub))
    tg_id = result.scalars().first()

    if not tg_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Telegram not linked")
    return True


async def check_role(
    user: Annotated[dict, Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
) -> UserRole:
    sub = user[0].get("sub")
    result = await db_session.execute(select(User.role).filter_by(sub=sub))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not found")
    return role
