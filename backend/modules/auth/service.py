import random
import secrets
from urllib.parse import urljoin, urlparse

from authlib.integrations.base_client.errors import MismatchingStateError, OAuthError
from fastapi import HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from jose import JWTError
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.configs.config import config
from backend.core.database.models.user import UserRole, UserScope
from backend.modules.auth.app_token import AppTokenManager
from backend.modules.auth.cookies import (
    set_app_token_cookie,
    set_kc_auth_cookies,
    unset_kc_auth_cookies,
)
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.auth.mock import build_mock_creds, get_mock_user_by_sub
from backend.modules.auth.oauth import exchange_code_for_credentials
from backend.modules.auth.repository import UserRepository
from backend.modules.auth.schemas import CurrentUserResponse, UserSchema


class AuthService:
    def __init__(
        self,
        db_session: AsyncSession,
        kc_manager: KeyCloakManager,
        app_token_manager: AppTokenManager,
    ):
        self.db_session = db_session
        self.kc_manager = kc_manager
        self.app_token_manager = app_token_manager
        self.user_repository = UserRepository(db_session)

    async def ensure_login_state(
        self,
        redis: Redis,
        state: str | None,
        return_to: str | None,
    ) -> str:
        if state:
            return state
        state = secrets.token_urlsafe(32)
        await redis.setex(f"csrf:{state}", 600, return_to or "/")
        return state

    def build_mock_callback_url(self, state: str, mock_user: str | None) -> str:
        cb = self.kc_manager.KEYCLOAK_REDIRECT_URI
        sep = "&" if "?" in cb else "?"
        callback_url = f"{cb}{sep}state={state}"
        if mock_user:
            callback_url += f"&mock_user={mock_user}"
        return callback_url

    async def prepare_reauth(
        self,
        request: Request,
        response: Response,
        refresh_token: str | None,
    ) -> None:
        if refresh_token:
            try:
                await self.kc_manager.revoke_offline_refresh_token(refresh_token)
            except Exception:
                pass
        unset_kc_auth_cookies(response)
        response.delete_cookie(key=config.COOKIE_APP_NAME)

    def get_authorize_redirect(self, request: Request, state: str, reauth: bool | None):
        options: dict = {}
        if reauth:
            options["kc_idp_hint"] = "google"
            options["prompt"] = "login"
            options["max_age"] = 0
        provider = getattr(self.kc_manager.oauth, self.kc_manager.__class__.__name__.lower())
        return provider.authorize_redirect(
            request,
            self.kc_manager.KEYCLOAK_REDIRECT_URI,
            state=state,
            **options,
        )

    def resolve_redirect_url(self, csrf_return_to: bytes | str | None) -> str:
        redirect_url = config.HOME_URL
        if not csrf_return_to:
            return redirect_url

        try:
            csrf_return_to_str = (
                csrf_return_to.decode("utf-8")
                if isinstance(csrf_return_to, (bytes, bytearray))
                else str(csrf_return_to)
            ).strip()
        except UnicodeDecodeError:
            return redirect_url

        parsed_return_to = urlparse(csrf_return_to_str)
        if (
            csrf_return_to_str
            and not parsed_return_to.scheme
            and not parsed_return_to.netloc
            and parsed_return_to.path.startswith("/")
            and not parsed_return_to.path.startswith("//")
        ):
            redirect_url = urljoin(config.HOME_URL, csrf_return_to_str)
        return redirect_url

    def seed_debug_oauth_state(self, request: Request, state: str) -> None:
        if config.IS_DEBUG and not config.MOCK_KEYCLOAK:
            session_state_key = f"{self.kc_manager.__class__.__name__.lower()}_oauth_state"
            if request.session.get(session_state_key) != state:
                request.session[session_state_key] = state

    @staticmethod
    def user_schema_from_creds(creds: dict) -> UserSchema:
        userinfo = creds.get("userinfo")
        if not userinfo:
            raise HTTPException(status_code=401, detail="Unable to obtain userinfo from provider")
        return UserSchema(
            email=userinfo["email"],
            role=UserRole.default,
            scope=UserScope.allowed,
            name=userinfo["given_name"],
            surname=userinfo["family_name"],
            picture=userinfo["picture"],
            sub=userinfo["sub"],
        )

    async def complete_oauth_callback(
        self,
        request: Request,
        redis: Redis,
        state: str,
        code: str,
    ) -> RedirectResponse:
        csrf_key = f"csrf:{state}"
        csrf_return_to = await redis.get(csrf_key)
        if csrf_return_to is None:
            raise HTTPException(status_code=400, detail="Invalid or expired state")

        redirect_url = self.resolve_redirect_url(csrf_return_to)

        code_key: str | None = None
        if code:
            code_key = f"kc_code:{code}"
            if await redis.exists(code_key):
                await redis.delete(csrf_key)
                return RedirectResponse(url=config.HOME_URL, status_code=303)

        self.seed_debug_oauth_state(request, state)

        try:
            creds = await exchange_code_for_credentials(request, self.kc_manager)
        except MismatchingStateError as exc:
            await redis.delete(csrf_key)
            raise HTTPException(
                status_code=400, detail="Login session expired. Please try again."
            ) from exc
        except OAuthError as exc:
            await redis.delete(csrf_key)
            raise HTTPException(
                status_code=400, detail=f"Authorization failed: {exc.error}"
            ) from exc
        except Exception as exc:
            await redis.delete(csrf_key)
            raise HTTPException(
                status_code=502, detail="Unexpected error while contacting identity provider."
            ) from exc

        if not config.MOCK_KEYCLOAK:
            try:
                await self.kc_manager.validate_keycloak_token(creds["access_token"])
            except JWTError as exc:
                raise HTTPException(
                    status_code=401,
                    detail=f"Invalid Keycloak token after code exchange: {exc}",
                ) from exc

        user_schema = self.user_schema_from_creds(creds)
        user = await self.user_repository.upsert(user_schema)
        app_token_str, _claims = await self.app_token_manager.create_app_token(
            user.sub, self.db_session
        )

        redirect_response = RedirectResponse(url=redirect_url, status_code=303)
        set_kc_auth_cookies(redirect_response, creds)
        set_app_token_cookie(
            redirect_response,
            app_token_str,
            self.app_token_manager.token_expiry.total_seconds(),
        )

        if code_key:
            await redis.setex(code_key, 300, "used")
        await redis.delete(csrf_key)
        return redirect_response

    async def refresh_tokens(self, kc_refresh_token: str) -> tuple[dict, dict, str]:
        if config.MOCK_KEYCLOAK:
            if not kc_refresh_token.startswith("mock_refresh_"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid mock refresh token",
                )
            sub = kc_refresh_token.removeprefix("mock_refresh_")
            new_kc_creds = build_mock_creds(get_mock_user_by_sub(sub))
        else:
            new_kc_creds = await self.kc_manager.refresh_access_token(kc_refresh_token)

        if config.MOCK_KEYCLOAK:
            kc_principal_sub = new_kc_creds["userinfo"]["sub"]
        else:
            kc_principal = await self.kc_manager.validate_keycloak_token(
                new_kc_creds["access_token"]
            )
            kc_principal_sub = kc_principal["sub"]

        new_app_token_str, new_app_claims = await self.app_token_manager.create_app_token(
            kc_principal_sub, self.db_session
        )
        return new_kc_creds, new_app_claims, new_app_token_str

    async def get_current_user(
        self,
        kc_principal: dict,
        app_principal: dict,
    ) -> CurrentUserResponse:
        sub: str = kc_principal.get("sub")
        if not app_principal.get("sub") or app_principal.get("sub") != sub:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="App token subject mismatch.",
            )

        user = await self.user_repository.get_by_sub(sub)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user_data_for_response = {
            **kc_principal,
            "role": app_principal.get("role"),
            "communities": app_principal.get("communities"),
            "department_id": user.department_id,
        }
        return CurrentUserResponse(user=user_data_for_response, tg_id=user.telegram_id)

    async def logout(self, refresh_token: str) -> None:
        if not config.MOCK_KEYCLOAK:
            await self.kc_manager.revoke_offline_refresh_token(refresh_token)

    @staticmethod
    def build_telegram_bind_payload(sub: str) -> dict:
        correct_number = random.randrange(1, 10)
        return {
            "correct_number": correct_number,
            "sub": sub,
            "start_payload": f"{sub}&{correct_number}",
        }
