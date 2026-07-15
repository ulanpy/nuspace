from typing import Optional

from google.auth.credentials import Credentials
from google.oauth2 import service_account


def load_signing_credentials_from_info(
    service_account_info: Optional[dict],
    scopes: Optional[list[str]] = None,
) -> Credentials:
    if not service_account_info:
        raise ValueError("Signing service account info is not configured")

    if scopes is None:
        scopes = ["https://www.googleapis.com/auth/cloud-platform"]

    return service_account.Credentials.from_service_account_info(
        info=service_account_info,
        scopes=scopes,
    )
