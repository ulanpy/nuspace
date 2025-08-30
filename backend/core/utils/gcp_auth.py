"""
Google Cloud Platform authentication utilities for service account impersonation.

This module provides utilities to generate impersonated credentials that can be used
to sign URLs without requiring hardcoded service account keys.
"""
import datetime
from typing import Optional

import google.auth
import google.auth.transport.requests
from google.auth import impersonated_credentials
from google.auth.credentials import Credentials


def get_impersonated_credentials(
    target_principal: str,
    scopes: Optional[list[str]] = None,
    lifetime: int = 3600,
) -> Credentials:
    """
    Create impersonated credentials for a target service account.
    
    This function uses the current default credentials (from compute engine metadata server)
    to impersonate the specified service account. This allows generating signed URLs
    without needing hardcoded service account keys.
    
    Args:
        target_principal: Email address of the service account to impersonate
        scopes: OAuth 2.0 scopes for the impersonated credentials
        lifetime: Lifetime of the impersonated credentials in seconds (max 3600)
    
    Returns:
        Impersonated credentials that can be used for signing operations
        
    Raises:
        google.auth.exceptions.DefaultCredentialsError: If default credentials cannot be obtained
        google.auth.exceptions.RefreshError: If credentials cannot be refreshed
    """
    if scopes is None:
        scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    
    # Get default credentials from the compute engine metadata server
    source_credentials, _ = google.auth.default(scopes=scopes)
    
    # Ensure the source credentials are refreshed
    if source_credentials.token is None:
        request = google.auth.transport.requests.Request()
        source_credentials.refresh(request)
    
    # Create impersonated credentials
    impersonated_creds = impersonated_credentials.Credentials(
        source_credentials=source_credentials,
        target_principal=target_principal,
        target_scopes=scopes,
        lifetime=lifetime,
    )
    
    return impersonated_creds


def get_signing_credentials(service_account_email: str) -> Credentials:
    """
    Get credentials suitable for signing operations (like generating signed URLs).
    
    This is a convenience function that creates impersonated credentials specifically
    for signing operations with a reasonable lifetime.
    
    Args:
        service_account_email: Email of the service account to impersonate for signing
        
    Returns:
        Credentials that can be used for signing operations
    """
    return get_impersonated_credentials(
        target_principal=service_account_email,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
        lifetime=3600,  # 1 hour should be sufficient for most operations
    )
