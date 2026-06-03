from fastapi import Request
from jose import jwt as jose_jwt

from backend.core.configs.config import config
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.auth.mock import build_mock_creds, select_mock_user


async def exchange_code_for_credentials(request: Request, kc_manager: KeyCloakManager) -> dict:
    if config.MOCK_KEYCLOAK:
        mock_selector = request.query_params.get("mock_user") or request.query_params.get("mu")
        userinfo = select_mock_user(mock_selector)
        return build_mock_creds(userinfo)

    provider = getattr(kc_manager.oauth, kc_manager.__class__.__name__.lower())
    token = await provider.authorize_access_token(request)

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
        try:
            userinfo = await provider.userinfo(token=token)
            token["userinfo"] = userinfo
        except Exception:
            pass

    return token
