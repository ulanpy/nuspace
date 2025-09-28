from fastapi import HTTPException, Request, Response
from jose import jwt as jose_jwt

from backend.core.configs.config import config
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.auth.schemas import UserRole, UserSchema, UserScope

# --- Mock Keycloak support (dev only) ---
# Three predefined mock users for local development
MOCK_USERS: list[dict] = [
    {
        "email": "alice@example.com",
        "given_name": "Alice",
        "family_name": "Anderson",
        "picture": "https://i.pravatar.cc/150?img=3",
        "sub": "mock-sub-alice",
    },
    {
        "email": "bob@example.com",
        "given_name": "Bob",
        "family_name": "Brown",
        "picture": "https://i.pravatar.cc/150?img=4",
        "sub": "mock-sub-bob",
    },
    {
        "email": "charlie@example.com",
        "given_name": "Charlie",
        "family_name": "Clark",
        "picture": "https://i.pravatar.cc/150?img=5",
        "sub": "mock-sub-charlie",
    },
]


def _select_mock_user(selector: str | None) -> dict:
    """Pick a mock user by index ("1".."3"), email, name, or sub. Defaults to first."""
    if not selector:
        return MOCK_USERS[0]
    s = selector.strip().lower()
    # by index
    if s in {"1", "2", "3"}:
        return MOCK_USERS[int(s) - 1]
    # by email or sub or given_name
    for u in MOCK_USERS:
        if s in {
            u["email"].lower(),
            u["sub"].lower(),
            u["given_name"].lower(),
        }:
            return u
    return MOCK_USERS[0]


def get_mock_user_by_sub(sub: str) -> dict:
    for u in MOCK_USERS:
        if u["sub"] == sub:
            return u
    return MOCK_USERS[0]


def build_mock_creds(userinfo: dict) -> dict:
    """Fabricate minimal credential payload expected by the app in dev."""
    sub = userinfo["sub"]
    return {
        "access_token": f"mock_access_{sub}",
        "refresh_token": f"mock_refresh_{sub}",
        "id_token": f"mock_id_{sub}",
        "userinfo": userinfo,
    }


async def exchange_code_for_credentials(request: Request):
    # In dev mode, bypass Keycloak and return mock creds
    if config.MOCK_KEYCLOAK:
        # allow both 'mock_user' and shorthand 'mu'
        mock_selector = request.query_params.get("mock_user") or request.query_params.get("mu")
        userinfo = _select_mock_user(mock_selector)
        return build_mock_creds(userinfo)

    kc: KeyCloakManager = request.app.state.kc_manager
    provider = getattr(kc.oauth, kc.__class__.__name__.lower())
    token = await provider.authorize_access_token(request)

    # Extract userinfo from access token claims (Keycloak includes profile data in access token)
    try:
        claims = jose_jwt.get_unverified_claims(token.get("access_token"))
        name = claims.get("name") or ""
        parts = name.split(" ") if name else []
        given_name = claims.get("given_name") or (parts[0] if parts else "")
        family_name = claims.get("family_name") or (parts[1] if len(parts) > 1 else "")
        token["userinfo"] = {
            "email": claims.get("email"),
            "given_name": given_name,
            "family_name": family_name,
            "picture": claims.get("picture", ""),
            "sub": claims.get("sub"),
        }
    except Exception:
        # Fallback: try userinfo endpoint if access token parsing fails
        try:
            userinfo = await provider.userinfo(token=token)
            token["userinfo"] = userinfo
        except Exception:
            pass

    return token


async def create_user_schema(creds: dict) -> UserSchema:
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


def set_kc_auth_cookies(response: Response, creds: dict):
    response.set_cookie(
        key=config.COOKIE_ACCESS_NAME,
        value=creds["access_token"],
        httponly=True,
        secure=not config.IS_DEBUG,  # False if config.IS_DEBUG is True AND reverse in otherwise
        samesite="Lax",  # Mitigate CSRF attacks
        max_age=3600,  # 1 hour
    )
    response.set_cookie(
        key=config.COOKIE_REFRESH_NAME,
        value=creds["refresh_token"],
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=30 * 24 * 60 * 60,  # 30 days
    )


def unset_kc_auth_cookies(response: Response):
    response.delete_cookie(key=config.COOKIE_ACCESS_NAME)
    response.delete_cookie(key=config.COOKIE_REFRESH_NAME)
