import json
import os

from fastapi import FastAPI
from google.api_core.exceptions import AlreadyExists, NotFound, PermissionDenied
from google.auth.credentials import with_scopes_if_required
from google.cloud import pubsub_v1, storage
from google.oauth2 import service_account

from backend.core.configs.config import Config

PUBSUB_SCOPES = ("https://www.googleapis.com/auth/pubsub",)


# TODO: This method is not per fastapi app.
# Hence, should be launched once across entire app.
# It works currently because we have only one fastapi app AND requests to gcloud are idempotent.
def setup_gcp(app: FastAPI) -> None:
    """
    Sets up Google Cloud Storage and Pub/Sub integration:
    1. Creates a subscription to the GCS bucket's object change notifications topic
    2. Configures push delivery to our API endpoint with OIDC authentication
    3. Enables real-time notifications when files are uploaded to the bucket

    Note for local development: push endpoint set as cloudflared ephemeral tunnel
    directing to http://nginx:80 (nginx) which then routes to the http://fastapi:8000/api/bucket/gcs-hook

    In production, the push endpoint is set to the real API endpoint (https://nuspace.kz/api/bucket/gcs-hook)
    """
    config: Config = app.state.config

    if config.USE_GCS_EMULATOR:
        # Configure client for emulator
        os.environ["STORAGE_EMULATOR_HOST"] = config.GCS_EMULATOR_HOST
        # Use a non-anonymous client with a dummy project for bucket creation support
        app.state.storage_client = storage.Client(project="dev")
        print(
            f"✅ Using GCS emulator at {config.GCS_EMULATOR_HOST} for bucket {config.BUCKET_NAME}"
        )

        # Ensure bucket exists in emulator
        try:
            bucket = app.state.storage_client.get_bucket(config.BUCKET_NAME)
        except Exception:
            try:
                bucket = app.state.storage_client.create_bucket(config.BUCKET_NAME, location="US")
                print(f"✅ Created emulator bucket: {bucket.name}")
            except Exception as e:
                print(f"⚠️  Warning: Could not create emulator bucket '{config.BUCKET_NAME}': {e}")
        # Skip CORS and Pub/Sub setup in emulator mode
        return

    # Real GCP setup: rely on Application Default Credentials (ADC)
    # When running on GCE, ADC will pull credentials from the metadata server.
    # Ensure container can reach metadata.google.internal (see compose extra_hosts).
    base_credentials = None
    storage_client_project = config.GCP_PROJECT_ID

    def _normalize_service_account_info(info: dict) -> dict:
        normalized = dict(info)
        raw_private_key = normalized.get("private_key")

        if isinstance(raw_private_key, str):
            stripped = raw_private_key.strip()

            if stripped.startswith("{") and stripped.endswith("}"):
                try:
                    nested_info = json.loads(raw_private_key)
                except json.JSONDecodeError:
                    nested_info = None
                if isinstance(nested_info, dict):
                    normalized = {**normalized, **nested_info}
                    normalized["private_key"] = nested_info.get("private_key", raw_private_key)

            normalized_private_key = normalized.get("private_key")

            if isinstance(normalized_private_key, str):
                cleaned_key = normalized_private_key.strip()

                if cleaned_key.startswith("\"") and cleaned_key.endswith("\""):
                    cleaned_key = cleaned_key[1:-1]

                if "\\n" in cleaned_key:
                    cleaned_key = cleaned_key.replace("\\n", "\n")

                normalized["private_key"] = cleaned_key

        return normalized

    signing_info: dict | None = None

    if config.SIGNING_SERVICE_ACCOUNT_INFO:
        try:
            signing_info = _normalize_service_account_info(config.SIGNING_SERVICE_ACCOUNT_INFO)
            base_credentials = service_account.Credentials.from_service_account_info(signing_info)
            storage_client_project = (
                signing_info.get("project_id")
                or config.GCP_PROJECT_ID
            )
        except Exception as exc:
            print(
                "⚠️  Warning: Could not create storage credentials from signing service account info. "
                f"Falling back to Application Default Credentials. Error: {exc}"
            )
            base_credentials = None
            signing_info = None

    storage_client_credentials = None
    pubsub_credentials = None

    if base_credentials:
        storage_client_credentials = with_scopes_if_required(
            base_credentials,
            storage.Client.SCOPE,
        )
        pubsub_credentials = with_scopes_if_required(
            base_credentials,
            PUBSUB_SCOPES,
        )

    app.state.storage_client = storage.Client(
        project=storage_client_project,
        credentials=storage_client_credentials,
    )

    # Cache impersonated signing credentials at startup to avoid per-request impersonation
    # These credentials are valid for 1 hour and can be reused across all signing operations
    from backend.modules.google_bucket.utils import load_signing_credentials_from_info

    try:
        if signing_info:
            app.state.signing_credentials = load_signing_credentials_from_info(signing_info)
            print("✅ Cached signing credentials from service account JSON")
        else:
            app.state.signing_credentials = None
            print("⚠️  Warning: Signing service account JSON not provided; signing disabled")
    except Exception as e:
        print(f"⚠️  Warning: Could not cache signing credentials: {e}")
        app.state.signing_credentials = None

    bucket = app.state.storage_client.bucket(config.BUCKET_NAME)
    bucket.cors = [
        {
            "origin": ["*"],
            "method": ["GET", "POST", "PUT", "OPTIONS"],
            "responseHeader": list(config.GCS_METADATA_HEADERS.values()),
            "maxAgeSeconds": 3600,
        }
    ]
    try:
        bucket.patch()
        print(f"✅ Set CORS policies for bucket {bucket.name}")
    except Exception as e:
        print(f"⚠️  Warning: Could not set CORS policies: {e}")
        # Don't fail startup, but log the issue

    # Use ADC for Pub/Sub as well
    client = pubsub_v1.SubscriberClient(credentials=pubsub_credentials)
    topic_path = client.topic_path(config.GCP_PROJECT_ID, config.GCP_TOPIC_ID)
    subscription_path = client.subscription_path(
        project=config.GCP_PROJECT_ID,
        subscription=f"gcs-object-created-sub-{config.ROUTING_PREFIX}",
    )
    try:
        subscription = client.create_subscription(
            name=subscription_path,
            topic=topic_path,
        )
        print(f"Subscription created: {subscription.name}")
    except AlreadyExists:
        print(f"Subscription already exists: {subscription_path}")
    except (PermissionDenied, NotFound) as e:
        print(
            "⚠️  Warning: Could not create subscription due to permission or missing resource: "
            f"{e}. Skipping Pub/Sub subscription setup; app will continue to start."
        )
        return

    push_config = pubsub_v1.types.PushConfig(  # type: ignore
        push_endpoint=f"{config.HOME_URL}/api/bucket/gcs-hook",
        oidc_token=pubsub_v1.types.PushConfig.OidcToken(
            service_account_email=config.PUSH_AUTH_SERVICE_ACCOUNT,
            audience=config.PUSH_AUTH_AUDIENCE,
        ),
    )
    update_mask = {"paths": ["push_config"]}

    try:
        response = client.update_subscription(
            request={
                "subscription": {
                    "name": subscription_path,
                    "push_config": push_config,
                },
                "update_mask": update_mask,
            }
        )
        print(f"✅ Updated push endpoint to: {response.push_config.push_endpoint}")
        print(f"✅ Push auth service account: {config.PUSH_AUTH_SERVICE_ACCOUNT}")
    except PermissionDenied as e:
        print(
            "⚠️  Warning: Could not update push config (OIDC). This typically requires "
            "roles/iam.serviceAccountTokenCreator on the push service account for the Pub/Sub service agent, "
            "and roles/pubsub.editor for managing subscriptions. "
            f"Error: {e}"
        )
